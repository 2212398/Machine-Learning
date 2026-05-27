import argparse
import json
import math
import os
import random
import sys
import time
from collections import Counter
from pathlib import Path

# Fix UTF-8 encoding for Vietnamese paths in console output
if sys.stdout and (not sys.stdout.encoding or sys.stdout.encoding.lower() != 'utf-8'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import torch
from torch import nn
from torch.amp import GradScaler, autocast
from torch.utils.data import DataLoader
from PIL import Image, ImageOps
from torchvision import datasets, models, transforms


def get_args():
    parser = argparse.ArgumentParser(description="Train EfficientNet-B4 for plant type classification")
    parser.add_argument("--data-dir", type=str, required=True, help="Path to plant dataset (ImageFolder format)")
    parser.add_argument("--val-dir", type=str, default="", help="Optional validation dataset path (ImageFolder format)")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--lr", type=float, default=5e-4)
    parser.add_argument("--min-lr", type=float, default=1e-6)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--label-smoothing", type=float, default=0.05)
    parser.add_argument("--class-weight-mode", choices=["none", "balanced"], default="balanced")
    parser.add_argument("--backbone", choices=["efficientnet_b4"], default="efficientnet_b4")
    parser.add_argument("--image-size", type=int, default=0, help="Override model image size (0 = backbone default)")
    parser.add_argument("--num-workers", type=int, default=6)
    parser.add_argument("--log-interval", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--early-stop-patience", type=int, default=7)
    parser.add_argument("--grad-clip", type=float, default=1.0)
    parser.add_argument("--no-amp", action="store_true", help="Disable automatic mixed precision on CUDA")
    parser.add_argument("--save-each-epoch", action="store_true")
    parser.add_argument("--output", type=str, default="../backend/app/models/plant_efficientnet_b4.pt")
    parser.add_argument(
        "--label-output",
        type=str,
        default="../backend/app/labels/plant_labels.json",
        help="Output path for class label order used by this model",
    )

    # Confidence audit metrics to tune backend thresholds
    parser.add_argument(
        "--report-plant-threshold",
        type=float,
        default=0.70,
        help="Threshold to treat plant as unknown (mirrors PLANT_THRESHOLD in backend/app/config.py)",
    )
    parser.add_argument(
        "--report-gate-confidence",
        type=float,
        default=0.90,
        help="Confidence gate for auto-confirm (mirrors PLANT_GATE_CONFIDENCE in backend/app/config.py)",
    )
    parser.add_argument(
        "--report-gate-margin",
        type=float,
        default=0.12,
        help="Top1-top2 margin gate for auto-confirm (mirrors PLANT_GATE_MARGIN in backend/app/config.py)",
    )
    parser.add_argument(
        "--report-top-confusions",
        type=int,
        default=5,
        help="Print top-N confident confusions (wrong predictions under auto-confirm gate)",
    )
    parser.add_argument(
        "--report-max-batches",
        type=int,
        default=0,
        help="Limit confidence report to first N batches (0 = no limit). Useful when val_dir is not provided.",
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


def get_backbone_image_size(backbone: str) -> int:
    return 380 if backbone == "efficientnet_b4" else 224


def rgb_loader(path: str):
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def build_model(backbone: str, num_classes: int):
    if backbone != "efficientnet_b4":
        raise ValueError(f"Unsupported backbone: {backbone}")

    model = models.efficientnet_b4(
        weights=models.EfficientNet_B4_Weights.DEFAULT,
        stochastic_depth_prob=0.3,
    )
    in_features = model.classifier[-1].in_features
    if in_features != 1792:
        raise ValueError(f"Expected EfficientNet-B4 classifier input features to be 1792, got {in_features}")

    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(in_features, 512),
        nn.SiLU(),
        nn.Dropout(p=0.3),
        nn.Linear(512, num_classes),
    )
    init_classifier(model.classifier)
    return model


def init_classifier(classifier: nn.Module) -> None:
    for module in classifier.modules():
        if isinstance(module, nn.Linear):
            nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
            if module.bias is not None:
                nn.init.zeros_(module.bias)


def freeze_backbone(model: nn.Module) -> None:
    features = getattr(model, "features", None)
    if features is None:
        return
    for param in features.parameters():
        param.requires_grad = False


def unfreeze_backbone(model: nn.Module) -> None:
    features = getattr(model, "features", None)
    if features is None:
        return
    for param in features.parameters():
        param.requires_grad = True


def set_optimizer_lr(optimizer: torch.optim.Optimizer, lr: float) -> None:
    for group in optimizer.param_groups:
        group["lr"] = lr


def seed_everything(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.benchmark = True


def build_train_transform(image_size: int) -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.RandomResizedCrop(image_size, scale=(0.65, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.15),
            transforms.RandomRotation(degrees=12),
            transforms.RandomGrayscale(p=0.05),
            transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.25, hue=0.04),
            transforms.GaussianBlur(kernel_size=5, sigma=(0.1, 2.0)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            transforms.RandomErasing(p=0.25, scale=(0.02, 0.18), ratio=(0.3, 3.3), value="random"),
        ]
    )


def build_eval_transform(image_size: int) -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
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
    plant_threshold: float = 0.70,
    gate_confidence: float = 0.90,
    gate_margin: float = 0.12,
    class_names: list[str] | None = None,
    top_confusions: int = 0,
    max_batches: int = 0,
) -> tuple[float, float, dict]:
    model.eval()
    running_loss = 0.0
    running_correct = 0
    running_total = 0

    plant_threshold = _clamp01(plant_threshold)
    gate_confidence = _clamp01(gate_confidence)
    gate_margin = _clamp01(gate_margin)

    top1_confs: list[float] = []
    margins: list[float] = []
    auto_total = 0
    auto_correct = 0
    unknown_total = 0
    confusion_counts: Counter[tuple[int, int]] = Counter()

    batches_seen = 0

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            with autocast("cuda", enabled=use_amp):
                logits = model(images)
                loss = criterion(logits, labels)

            preds = logits.argmax(dim=1)
            batch_size = labels.size(0)

            # Confidence/margin metrics (match backend behavior)
            probs = torch.softmax(logits.float(), dim=1)
            k = 2 if probs.size(1) >= 2 else 1
            top_probs, top_idx = torch.topk(probs, k=k, dim=1)
            top1_prob = top_probs[:, 0]
            top2_prob = top_probs[:, 1] if k == 2 else torch.zeros_like(top1_prob)
            margin = top1_prob - top2_prob

            top1_confs.extend(top1_prob.detach().cpu().tolist())
            margins.extend(margin.detach().cpu().tolist())

            unknown_mask = top1_prob < plant_threshold
            auto_mask = (~unknown_mask) & (top1_prob >= gate_confidence) & (margin >= gate_margin)
            correct_mask = preds.eq(labels)

            unknown_total += int(unknown_mask.sum().item())
            auto_total += int(auto_mask.sum().item())
            auto_correct += int((auto_mask & correct_mask).sum().item())

            if top_confusions > 0 and class_names:
                wrong_auto_idx = torch.nonzero(auto_mask & (~correct_mask), as_tuple=False).flatten().tolist()
                if wrong_auto_idx:
                    labels_cpu = labels.detach().cpu().tolist()
                    preds_cpu = preds.detach().cpu().tolist()
                    for j in wrong_auto_idx:
                        true_idx = int(labels_cpu[j])
                        pred_idx = int(preds_cpu[j])
                        confusion_counts[(true_idx, pred_idx)] += 1

            running_loss += loss.item() * batch_size
            running_correct += (preds == labels).sum().item()
            running_total += batch_size

            batches_seen += 1
            if max_batches and batches_seen >= int(max_batches):
                break

    avg_loss = running_loss / max(1, running_total)
    avg_acc = 100.0 * running_correct / max(1, running_total)

    conf_stats = _summarize_conf(top1_confs)
    margin_stats = _summarize_conf(margins)

    auto_acc = 100.0 * auto_correct / max(1, auto_total)
    auto_rate = 100.0 * auto_total / max(1, running_total)
    unknown_rate = 100.0 * unknown_total / max(1, running_total)

    report = {
        "plant_threshold": plant_threshold,
        "gate_confidence": gate_confidence,
        "gate_margin": gate_margin,
        "unknown_rate": unknown_rate,
        "auto_confirm_rate": auto_rate,
        "auto_confirm_acc": auto_acc,
        "top1_conf": conf_stats,
        "margin": margin_stats,
        "confident_confusions": [],
    }

    if top_confusions > 0 and class_names and confusion_counts:
        items = confusion_counts.most_common(int(top_confusions))
        formatted = []
        for (true_idx, pred_idx), count in items:
            true_name = class_names[true_idx] if 0 <= true_idx < len(class_names) else str(true_idx)
            pred_name = class_names[pred_idx] if 0 <= pred_idx < len(class_names) else str(pred_idx)
            formatted.append({"true": true_name, "pred": pred_name, "count": int(count)})
        report["confident_confusions"] = formatted

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

    image_size = int(args.image_size) if int(args.image_size) > 0 else get_backbone_image_size(args.backbone)
    train_transform = build_train_transform(image_size)
    eval_transform = build_eval_transform(image_size)

    train_dataset = datasets.ImageFolder(str(train_dir), transform=train_transform, loader=rgb_loader)
    persistent_workers = (args.num_workers > 0) and (os.name != "nt")
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=pin_memory,
        persistent_workers=persistent_workers,
    )

    val_loader = None
    if val_dir is not None:
        val_dataset = datasets.ImageFolder(str(val_dir), transform=eval_transform, loader=rgb_loader)
        val_loader = DataLoader(
            val_dataset,
            batch_size=args.batch_size,
            shuffle=False,
            num_workers=args.num_workers,
            pin_memory=pin_memory,
            persistent_workers=persistent_workers,
        )
    else:
        val_dataset = None

    model = build_model(args.backbone, num_classes=len(train_dataset.classes))
    model.to(device)

    class_weights = None
    if args.class_weight_mode == "balanced":
        class_weights = compute_class_weights(train_dataset).to(device)

    criterion = build_criterion(class_weights=class_weights, label_smoothing=args.label_smoothing)
    freeze_backbone(model)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=max(1, args.epochs - 5),
        eta_min=max(0.0, args.min_lr),
    )
    scaler = GradScaler("cuda", enabled=use_amp)

    print("=" * 80)
    print("[Plant Training] EfficientNet-B4")
    print(f"device={device} backbone={args.backbone} image_size={image_size} image_loader=RGB")
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
        if epoch <= 5:
            phase = "Frozen"
            freeze_backbone(model)
            set_optimizer_lr(optimizer, 1e-3)
        else:
            phase = "Unfrozen"
            unfreeze_backbone(model)
            if epoch == 6:
                set_optimizer_lr(optimizer, args.lr)
                scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                    optimizer,
                    T_max=max(1, args.epochs - 5),
                    eta_min=max(0.0, args.min_lr),
                )

        current_lr = optimizer.param_groups[0]["lr"]
        print(f"[Epoch {epoch}/{args.epochs}] phase={phase} lr={current_lr:.7f}")

        for step, (images, labels) in enumerate(train_loader, start=1):
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad(set_to_none=True)
            with autocast("cuda", enabled=use_amp):
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
                batch_loss = float(loss.item())
                batch_acc = 100.0 * float((preds == labels).sum().item()) / max(1, batch_size)
                avg_loss = running_loss / max(1, running_total)
                avg_acc = 100.0 * running_correct / max(1, running_total)
                elapsed = time.time() - epoch_start
                eta = (elapsed / max(1, step)) * (total_steps - step)
                progress = 100.0 * step / max(1, total_steps)
                print(
                    f"[Train][Epoch {epoch}/{args.epochs}] "
                    f"step {step}/{total_steps} "
                    f"({progress:.1f}%) "
                    f"loss={batch_loss:.4f} (avg {avg_loss:.4f}) "
                    f"acc={batch_acc:.2f}% (avg {avg_acc:.2f}%) "
                    f"eta={eta:.1f}s"
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
                plant_threshold=args.report_plant_threshold,
                gate_confidence=args.report_gate_confidence,
                gate_margin=args.report_gate_margin,
                class_names=val_dataset.classes if val_dataset is not None else train_dataset.classes,
                top_confusions=max(0, int(args.report_top_confusions)),
            )
            metric = val_acc
            print(
                f"[Epoch {epoch}/{args.epochs}] "
                f"train_loss={train_loss:.4f} train_acc={train_acc:.2f}% | "
                f"val_loss={val_loss:.4f} val_acc={val_acc:.2f}%"
            )

            conf = report.get("top1_conf", {})
            mar = report.get("margin", {})
            print(
                "[Val][Gate Audit] "
                f"plant_thr={report.get('plant_threshold', 0):.2f} "
                f"gate_conf={report.get('gate_confidence', 0):.2f} "
                f"gate_margin={report.get('gate_margin', 0):.2f} | "
                f"unknown={report.get('unknown_rate', 0):.2f}% "
                f"auto_confirm={report.get('auto_confirm_rate', 0):.2f}% "
                f"auto_acc={report.get('auto_confirm_acc', 0):.2f}% | "
                f"conf_p50={conf.get('p50', 0):.3f} p90={conf.get('p90', 0):.3f} p95={conf.get('p95', 0):.3f} | "
                f"margin_p50={mar.get('p50', 0):.3f} p90={mar.get('p90', 0):.3f} p95={mar.get('p95', 0):.3f}"
            )

            confusions = report.get("confident_confusions") or []
            if confusions:
                parts = [f"{x['true']}->{x['pred']}:{x['count']}" for x in confusions]
                print("[Val][Confident Confusions] " + ", ".join(parts))
        else:
            metric = train_acc
            print(
                f"[Epoch {epoch}/{args.epochs}] "
                f"train_loss={train_loss:.4f} train_acc={train_acc:.2f}%"
            )

            if args.report_max_batches:
                _, _, report = evaluate(
                    model,
                    train_loader,
                    criterion,
                    device,
                    use_amp=use_amp,
                    plant_threshold=args.report_plant_threshold,
                    gate_confidence=args.report_gate_confidence,
                    gate_margin=args.report_gate_margin,
                    class_names=train_dataset.classes,
                    top_confusions=max(0, int(args.report_top_confusions)),
                    max_batches=max(1, int(args.report_max_batches)),
                )
                conf = report.get("top1_conf", {})
                mar = report.get("margin", {})
                print(
                    "[Train][Gate Audit] "
                    f"(first {args.report_max_batches} batches) "
                    f"plant_thr={report.get('plant_threshold', 0):.2f} "
                    f"gate_conf={report.get('gate_confidence', 0):.2f} "
                    f"gate_margin={report.get('gate_margin', 0):.2f} | "
                    f"unknown={report.get('unknown_rate', 0):.2f}% "
                    f"auto_confirm={report.get('auto_confirm_rate', 0):.2f}% "
                    f"auto_acc={report.get('auto_confirm_acc', 0):.2f}% | "
                    f"conf_p50={conf.get('p50', 0):.3f} p90={conf.get('p90', 0):.3f} p95={conf.get('p95', 0):.3f} | "
                    f"margin_p50={mar.get('p50', 0):.3f} p90={mar.get('p90', 0):.3f} p95={mar.get('p95', 0):.3f}"
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

        if epoch > 5:
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
    print(f"Saved plant label order to {label_path}")


if __name__ == "__main__":
    main()
