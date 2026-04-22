import argparse
import json
import random
import time
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms


def get_args():
    parser = argparse.ArgumentParser(description="Train MobileNetV3 for disease classification")
    parser.add_argument("--data-dir", type=str, required=True, help="Path to disease dataset (ImageFolder format)")
    parser.add_argument("--val-dir", type=str, default="", help="Optional validation dataset path (ImageFolder format)")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--backbone", choices=["small", "large"], default="large")
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--log-interval", type=int, default=25)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--save-each-epoch", action="store_true")
    parser.add_argument("--output", type=str, default="../backend/app/models/disease_mobilenetv3.pt")
    parser.add_argument(
        "--label-output",
        type=str,
        default="../backend/app/labels/disease_labels_flat.json",
        help="Output path for class label order used by this model",
    )
    return parser.parse_args()


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


def evaluate(model, loader, criterion, device: str) -> tuple[float, float]:
    model.eval()
    running_loss = 0.0
    running_correct = 0
    running_total = 0

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            logits = model(images)
            loss = criterion(logits, labels)

            preds = logits.argmax(dim=1)
            batch_size = labels.size(0)

            running_loss += loss.item() * batch_size
            running_correct += (preds == labels).sum().item()
            running_total += batch_size

    avg_loss = running_loss / max(1, running_total)
    avg_acc = 100.0 * running_correct / max(1, running_total)
    return avg_loss, avg_acc


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

    transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    train_dataset = datasets.ImageFolder(str(train_dir), transform=transform)
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
        val_dataset = datasets.ImageFolder(str(val_dir), transform=transform)
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

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

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
        f"epochs={args.epochs} batch_size={args.batch_size} lr={args.lr} "
        f"num_workers={args.num_workers}"
    )
    print("=" * 80)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    best_metric = float("-inf")

    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_start = time.time()
        running_loss = 0.0
        running_correct = 0
        running_total = 0
        total_steps = len(train_loader)

        for step, (images, labels) in enumerate(train_loader, start=1):
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()

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
            val_loss, val_acc = evaluate(model, val_loader, criterion, device)
            metric = val_acc
            print(
                f"[Epoch {epoch}/{args.epochs}] "
                f"train_loss={train_loss:.4f} train_acc={train_acc:.2f}% | "
                f"val_loss={val_loss:.4f} val_acc={val_acc:.2f}%"
            )
        else:
            metric = train_acc
            print(
                f"[Epoch {epoch}/{args.epochs}] "
                f"train_loss={train_loss:.4f} train_acc={train_acc:.2f}%"
            )

        if metric > best_metric:
            best_metric = metric
            torch.save(model.state_dict(), str(output_path))
            print(f"[Checkpoint] best model saved to {output_path} (metric={metric:.2f})")

        if args.save_each_epoch:
            epoch_path = output_path.with_name(f"{output_path.stem}.epoch{epoch}{output_path.suffix}")
            torch.save(model.state_dict(), str(epoch_path))
            print(f"[Checkpoint] epoch model saved to {epoch_path}")

        epoch_seconds = time.time() - epoch_start
        print(f"[Epoch {epoch}/{args.epochs}] elapsed={epoch_seconds:.1f}s")
        print("-" * 80)

    print(f"Training finished. Best checkpoint: {output_path}")

    label_path = Path(args.label_output)
    label_path.parent.mkdir(parents=True, exist_ok=True)
    with label_path.open("w", encoding="ascii") as f:
        json.dump(train_dataset.classes, f, ensure_ascii=True, indent=2)
    print(f"Saved disease label order to {label_path}")


if __name__ == "__main__":
    main()