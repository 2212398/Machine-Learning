from pathlib import Path
import argparse
import shutil


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build plant-level split from disease-class split"
    )
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument(
        "--copy-mode",
        choices=["hardlink", "copy"],
        default="hardlink",
        help="Use hardlink to save disk; fallback to copy if hardlink fails",
    )
    return parser.parse_args()


def link_or_copy(src: Path, dst: Path, copy_mode: str) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if copy_mode == "hardlink":
        try:
            if dst.exists():
                dst.unlink()
            dst.hardlink_to(src)
            return
        except OSError:
            pass
    shutil.copy2(src, dst)


def main() -> None:
    args = parse_args()

    source_root = args.source_root
    output_root = args.output_root

    if not source_root.exists():
        raise FileNotFoundError(f"Source root not found: {source_root}")

    if output_root.exists():
        shutil.rmtree(output_root)

    for split in ["train", "val", "test"]:
        split_src = source_root / split
        split_dst = output_root / split
        split_dst.mkdir(parents=True, exist_ok=True)

        for class_dir in split_src.iterdir():
            if not class_dir.is_dir():
                continue

            class_name = class_dir.name
            plant = class_name.split("___", 1)[0]
            plant_dir = split_dst / plant
            plant_dir.mkdir(parents=True, exist_ok=True)

            for img in class_dir.iterdir():
                if not img.is_file():
                    continue
                target = plant_dir / f"{class_name}__{img.name}"
                link_or_copy(img, target, args.copy_mode)

    print(f"Created plant split at: {output_root.resolve()}")
    for split in ["train", "val", "test"]:
        classes = sorted([d for d in (output_root / split).iterdir() if d.is_dir()])
        total_images = 0
        for cls in classes:
            total_images += sum(1 for p in cls.iterdir() if p.is_file())
        print(f"{split}: plants={len(classes)}, images={total_images}")


if __name__ == "__main__":
    main()
