import argparse
import json
import math
import random
import time
from pathlib import Path
from collections import defaultdict

import torch
from torch import nn
from torch.cuda.amp import GradScaler, autocast
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms


def get_args():
    parser = argparse.ArgumentParser(description="Train MobileNetV3 for disease classification")
    parser.add_argument("--data-dir", type=str, required=True, help="Path to disease dataset (ImageFolder format)")
    parser.add_argument("--val-dir", type=str, default="", help="Optional validation dataset path (ImageFolder format)")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--batch-size", type=int, default=48)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--min-lr", type=float, default=1e-6)
    parser.add_argument("--weight-decay", type=float, default=2e-4)
    parser.add_argument("--label-smoothing", type=float, default=0.1)
    parser.add_argument("--class-weight-mode", choices=["none", "balanced"], default="balanced")
    parser.add_argument("--backbone", choices=["small", "large"], default="large")
    parser.add_argument("--num-workers", type=int, default=4)
    parser.add_argument("--log-interval", type=int, default=25)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--early-stop-patience", type=int, default=8)
    parser.add_argument("--grad-clip", type=float, default=1.0)
    parser.add_argument("--no-amp", action="store_true", help="Disable automatic mixed precision on CUDA")
    parser.add_argument("--save-each-epoch", action="store_true")
    parser.add_argument("--output", type=str, default="../backend/app/models/disease_mobilenetv3.pt")
    parser.add_argument(
        "--label-output",
        type=str,
        default="../backend/app/labels/disease_labels_flat.json",
        help="Output path for class label order used by this model",
    )

    # Confidence audit metrics to tune backend thresholds
    parser.add_argument(
        "--report-disease-threshold",
        type=float,
        default=0.60,
        help="Threshold to output unknown_disease (mirrors DISEASE_THRESHOLD in backend/app/config.py)",
    )
    return parser.parse_args()


def _clamp01(value: float) -> float:
    try:
        x = float(value)
    except Exception:
        x = 0.0
    return max(0.0, min(1.0, x))


def _percentile(sorted_values: list[float], q: float) -> float:
    if not sorted_values:
        return 0.0
    q = max(0.0, min(1.0, float(q)))
    if len(sorted_values) == 1:
        return float(sorted_values[0])
    k = (len(sorted_values) - 1) * q
    f = int(math.floor(k))
    c = int(math.ceil(k))
    if f == c:
        return float(sorted_values[f])
    d0 = sorted_values[f] * (c - k)
    d1 = sorted_values[c] * (k - f)
    return float(d0 + d1)


def _summarize_conf(values: list[float]) -> dict[str, float]:
    if not values:
        return {"p50": 0.0, "p90": 0.0, "p95": 0.0, "mean": 0.0}
    s = sorted(float(v) for v in values)
    return {
        "p50": _percentile(s, 0.50),
        "p90": _percentile(s, 0.90),
        "p95": _percentile(s, 0.95),
        "mean": float(sum(s) / max(1, len(s))),
    }


def build_model(backbone: str, num_classes: int):
    if backbone == "small":
        model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    else:
        model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.DEFAULT)

    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, num_classes)
    return model


def seed_everything(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.benchmark = True


def build_train_transform() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.03),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )


def build_eval_transform() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )


def compute_class_weights(image_folder: datasets.ImageFolder) -> torch.Tensor:
    targets = torch.tensor(image_folder.targets, dtype=torch.long)
    num_classes = len(image_folder.classes)
    counts = torch.bincount(targets, minlength=num_classes).float()
    weights = counts.sum() / counts.clamp_min(1.0)
    return weights / weights.mean().clamp_min(1e-12)


def build_criterion(class_weights: torch.Tensor | None, label_smoothing: float) -> nn.Module:
    kwargs = {"label_smoothing": max(0.0, min(0.2, label_smoothing))}
    if class_weights is not None:
        kwargs["weight"] = class_weights

    try:
        return nn.CrossEntropyLoss(**kwargs)
    except TypeError:
        kwargs.pop("label_smoothing", None)
        return nn.CrossEntropyLoss(**kwargs)


def evaluate(
    model,
    loader,
    criterion,
    device: str,
    use_amp: bool,
    *,
    class_names: list[str] | None = None,
    disease_threshold: float = 0.60,
) -> tuple[float, float, dict]:
    model.eval()
    running_loss = 0.0
    running_correct = 0
    running_total = 0

    disease_threshold = _clamp01(disease_threshold)

    # Local (plant-restricted) metrics, approximating backend Step2 behavior
    local_confs: list[float] = []
    local_margins: list[float] = []
    local_correct = 0
    local_total = 0
    local_unknown = 0
    local_known_correct = 0
    local_known_total = 0

    plant_to_indices: dict[str, list[int]] = {}
    if class_names:
        groups: dict[str, list[int]] = defaultdict(list)
        for idx, name in enumerate(class_names):
            plant = str(name).split("___", 1)[0] if "___" in str(name) else str(name)
            groups[plant].append(int(idx))
        plant_to_indices = dict(groups)

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            with autocast(enabled=use_amp):
                logits = model(images)
                loss = criterion(logits, labels)

            preds = logits.argmax(dim=1)
            batch_size = labels.size(0)

            if class_names and plant_to_indices:
                # Compute per-plant restricted softmax within the batch.
                logits_f = logits.float()
                labels_cpu = labels.detach().cpu().tolist()

                batch_groups: dict[str, list[int]] = defaultdict(list)
                for i, y in enumerate(labels_cpu):
                    true_name = class_names[int(y)] if 0 <= int(y) < len(class_names) else ""
                    plant = str(true_name).split("___", 1)[0] if "___" in str(true_name) else str(true_name)
                    batch_groups[plant].append(int(i))

                for plant, batch_idxs in batch_groups.items():
                    allowed = plant_to_indices.get(plant)
                    if not allowed:
                        continue
                    allowed_t = torch.tensor(allowed, device=logits_f.device, dtype=torch.long)
                    sub_logits = logits_f.index_select(0, torch.tensor(batch_idxs, device=logits_f.device)).index_select(
                        1, allowed_t
                    )
                    sub_probs = torch.softmax(sub_logits, dim=1)
                    k = 2 if sub_probs.size(1) >= 2 else 1
                    top_probs, top_idx = torch.topk(sub_probs, k=k, dim=1)
                    top1_prob = top_probs[:, 0]
                    top2_prob = top_probs[:, 1] if k == 2 else torch.zeros_like(top1_prob)
                    margin = top1_prob - top2_prob

                    global_pred = allowed_t[top_idx[:, 0]]
                    true_batch = labels.index_select(0, torch.tensor(batch_idxs, device=labels.device))
                    correct_mask = global_pred.eq(true_batch)

                    local_total += int(len(batch_idxs))
                    local_correct += int(correct_mask.sum().item())

                    local_confs.extend(top1_prob.detach().cpu().tolist())
                    local_margins.extend(margin.detach().cpu().tolist())

                    unknown_mask = top1_prob < disease_threshold
                    local_unknown += int(unknown_mask.sum().item())

                    known_mask = ~unknown_mask
                    if int(known_mask.sum().item()) > 0:
                        local_known_total += int(known_mask.sum().item())
                        local_known_correct += int((known_mask & correct_mask).sum().item())

            running_loss += loss.item() * batch_size
            running_correct += (preds == labels).sum().item()
            running_total += batch_size

    avg_loss = running_loss / max(1, running_total)
    avg_acc = 100.0 * running_correct / max(1, running_total)

    report: dict = {
        "disease_threshold": disease_threshold,
        "local_total": local_total,
        "local_acc": (100.0 * local_correct / max(1, local_total)) if local_total else 0.0,
        "local_unknown_rate": (100.0 * local_unknown / max(1, local_total)) if local_total else 0.0,
        "local_known_coverage": (100.0 * local_known_total / max(1, local_total)) if local_total else 0.0,
        "local_known_acc": (100.0 * local_known_correct / max(1, local_known_total)) if local_known_total else 0.0,
        "local_top1_conf": _summarize_conf(local_confs),
        "local_margin": _summarize_conf(local_margins),
    }

    return avg_loss, avg_acc, report


def main():
    args = get_args()
    seed_everything(args.seed)

    train_dir = Path(args.data_dir)
    if not train_dir.exists():
        raise FileNotFoundError(f"Dataset not found: {train_dir}")

    val_dir = Path(args.val_dir) if args.val_dir else None
    if val_dir is not None and not val_dir.exists():
        raise FileNotFoundError(f"Validation dataset not found: {val_dir}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    pin_memory = device == "cuda"
    use_amp = device == "cuda" and not args.no_amp

    train_transform = build_train_transform()
    eval_transform = build_eval_transform()

    train_dataset = datasets.ImageFolder(str(train_dir), transform=train_transform)
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=pin_memory,
        persistent_workers=args.num_workers > 0,
    )

    val_loader = None
    if val_dir is not None:
        val_dataset = datasets.ImageFolder(str(val_dir), transform=eval_transform)
        val_loader = DataLoader(
            val_dataset,
            batch_size=args.batch_size,
            shuffle=False,
            num_workers=args.num_workers,
            pin_memory=pin_memory,
            persistent_workers=args.num_workers > 0,
        )
    else:
        val_dataset = None

    model = build_model(args.backbone, num_classes=len(train_dataset.classes))
    model.to(device)

    class_weights = None
    if args.class_weight_mode == "balanced":
        class_weights = compute_class_weights(train_dataset).to(device)

    criterion = build_criterion(class_weights=class_weights, label_smoothing=args.label_smoothing)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=max(1, args.epochs),
        eta_min=max(0.0, args.min_lr),
    )
    scaler = GradScaler(enabled=use_amp)

    print("=" * 80)
    print("[Disease Training] MobileNetV3")
    print(f"device={device} backbone={args.backbone}")
    print(f"train_dir={train_dir}")
    if val_dataset is not None:
        print(f"val_dir={val_dir}")
        print(f"val_samples={len(val_dataset)}")
    else:
        print("val_dir=<not set>")
    print(f"train_samples={len(train_dataset)} classes={len(train_dataset.classes)}")
    print(
        f"epochs={args.epochs} batch_size={args.batch_size} lr={args.lr} min_lr={args.min_lr} "
        f"num_workers={args.num_workers} amp={use_amp}"
    )
    print(
        f"optimizer=AdamW weight_decay={args.weight_decay} "
        f"label_smoothing={args.label_smoothing} class_weight_mode={args.class_weight_mode}"
    )
    print("=" * 80)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    best_metric = float("-inf")
    no_improve_epochs = 0

    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_start = time.time()
        running_loss = 0.0
        running_correct = 0
        running_total = 0
        total_steps = len(train_loader)
        current_lr = optimizer.param_groups[0]["lr"]
        print(f"[Epoch {epoch}/{args.epochs}] lr={current_lr:.7f}")

        for step, (images, labels) in enumerate(train_loader, start=1):
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad(set_to_none=True)
            with autocast(enabled=use_amp):
                logits = model(images)
                loss = criterion(logits, labels)

            scaler.scale(loss).backward()
            if args.grad_clip > 0:
                scaler.unscale_(optimizer)
                nn.utils.clip_grad_norm_(model.parameters(), max_norm=args.grad_clip)
            scaler.step(optimizer)
            scaler.update()

            preds = logits.argmax(dim=1)
            batch_size = labels.size(0)

            running_loss += loss.item() * batch_size
            running_correct += (preds == labels).sum().item()
            running_total += batch_size

            if step % args.log_interval == 0 or step == total_steps:
                avg_loss = running_loss / max(1, running_total)
                avg_acc = 100.0 * running_correct / max(1, running_total)
                elapsed = time.time() - epoch_start
                eta = (elapsed / max(1, step)) * (total_steps - step)
                print(
                    f"[Train][Epoch {epoch}/{args.epochs}] "
                    f"step {step}/{total_steps} "
                    f"loss={avg_loss:.4f} acc={avg_acc:.2f}% eta={eta:.1f}s"
                )

        train_loss = running_loss / max(1, running_total)
        train_acc = 100.0 * running_correct / max(1, running_total)

        if val_loader is not None:
            val_loss, val_acc, report = evaluate(
                model,
                val_loader,
                criterion,
                device,
                use_amp=use_amp,
                class_names=val_dataset.classes if val_dataset is not None else train_dataset.classes,
                disease_threshold=args.report_disease_threshold,
            )
            metric = val_acc
            print(
                f"[Epoch {epoch}/{args.epochs}] "
                f"train_loss={train_loss:.4f} train_acc={train_acc:.2f}% | "
                f"val_loss={val_loss:.4f} val_acc={val_acc:.2f}%"
            )

            conf = report.get("local_top1_conf", {})
            mar = report.get("local_margin", {})
            print(
                "[Val][Step2 Audit] "
                f"disease_thr={report.get('disease_threshold', 0):.2f} | "
                f"local_acc={report.get('local_acc', 0):.2f}% "
                f"unknown={report.get('local_unknown_rate', 0):.2f}% "
                f"known_cov={report.get('local_known_coverage', 0):.2f}% "
                f"known_acc={report.get('local_known_acc', 0):.2f}% | "
                f"conf_p50={conf.get('p50', 0):.3f} p90={conf.get('p90', 0):.3f} p95={conf.get('p95', 0):.3f} | "
                f"margin_p50={mar.get('p50', 0):.3f} p90={mar.get('p90', 0):.3f} p95={mar.get('p95', 0):.3f}"
            )
        else:
            metric = train_acc
            print(
                f"[Epoch {epoch}/{args.epochs}] "
                f"train_loss={train_loss:.4f} train_acc={train_acc:.2f}%"
            )

        if metric > best_metric:
            best_metric = metric
            no_improve_epochs = 0
            torch.save(model.state_dict(), str(output_path))
            print(f"[Checkpoint] best model saved to {output_path} (metric={metric:.2f})")
        else:
            no_improve_epochs += 1

        if args.save_each_epoch:
            epoch_path = output_path.with_name(f"{output_path.stem}.epoch{epoch}{output_path.suffix}")
            torch.save(model.state_dict(), str(epoch_path))
            print(f"[Checkpoint] epoch model saved to {epoch_path}")

        scheduler.step()

        epoch_seconds = time.time() - epoch_start
        print(f"[Epoch {epoch}/{args.epochs}] elapsed={epoch_seconds:.1f}s")
        print("-" * 80)

        if val_loader is not None and no_improve_epochs >= max(1, args.early_stop_patience):
            print(
                f"[Early Stop] No val improvement for {no_improve_epochs} epochs "
                f"(patience={args.early_stop_patience})."
            )
            break

    print(f"Training finished. Best checkpoint: {output_path}")

    label_path = Path(args.label_output)
    label_path.parent.mkdir(parents=True, exist_ok=True)
    with label_path.open("w", encoding="ascii") as f:
        json.dump(train_dataset.classes, f, ensure_ascii=True, indent=2)
    print(f"Saved disease label order to {label_path}")


if __name__ == "__main__":
    main()