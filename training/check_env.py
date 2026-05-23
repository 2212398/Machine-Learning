# -*- coding: utf-8 -*-
import os
import sys


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def _count_images(path: str) -> tuple[int, int]:
    classes = [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
    total = 0
    for cls in classes:
        cls_dir = os.path.join(path, cls)
        total += sum(
            1
            for name in os.listdir(cls_dir)
            if name.lower().endswith((".jpg", ".jpeg", ".png"))
        )
    return len(classes), total


def check_all() -> None:
    print("=" * 55)
    print("  Kiem tra moi truong training")
    print("=" * 55)

    errors: list[str] = []
    warnings: list[str] = []

    py_ver = sys.version_info
    status = "[OK]" if py_ver >= (3, 9) else "[ERR]"
    print(f"{status} Python: {sys.version.split()[0]}")
    if py_ver < (3, 9):
        errors.append("Can Python >= 3.9")

    try:
        import torch

        cuda_ok = torch.cuda.is_available()
        status = "[OK]" if cuda_ok else "[WARN]"
        print(f"{status} PyTorch: {torch.__version__}")
        if cuda_ok:
            gpu_name = torch.cuda.get_device_name(0)
            vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
            print(f"[OK] GPU: {gpu_name}")
            print(f"[OK] VRAM: {vram_gb:.1f} GB")
            if vram_gb < 6:
                warnings.append(f"VRAM {vram_gb:.1f}GB thap; giam batch size xuong 8")
        else:
            warnings.append("CUDA khong kha dung; training tren CPU se rat cham")
    except ImportError:
        errors.append("PyTorch chua duoc cai: pip install torch torchvision")

    try:
        import torchvision

        print(f"[OK] torchvision: {torchvision.__version__}")
    except ImportError:
        errors.append("torchvision chua duoc cai: pip install torchvision")

    try:
        import timm

        print(f"[OK] timm: {timm.__version__}")
    except ImportError:
        warnings.append("timm chua cai (neu dung): pip install timm")

    plant_train = os.path.join(
        PROJECT_ROOT, "PlantDisease", "prepared_template_style_plant_split", "train"
    )
    disease_train = os.path.join(
        PROJECT_ROOT, "PlantDisease", "prepared_template_style_split", "train"
    )

    for path, name in [(plant_train, "Plant train"), (disease_train, "Disease train")]:
        if os.path.exists(path):
            class_count, image_count = _count_images(path)
            print(f"[OK] {name}: {class_count} class, {image_count:,} anh")
        else:
            errors.append(f"Khong tim thay: {path}")
            print(f"[ERR] {name}: {path}")

    model_out = os.path.join(PROJECT_ROOT, "code", "backend", "app", "models")
    label_out = os.path.join(PROJECT_ROOT, "code", "backend", "app", "labels")
    for path, name in [(model_out, "Models output"), (label_out, "Labels output")]:
        if os.path.exists(path):
            print(f"[OK] {name}: {path}")
        else:
            errors.append(f"Thu muc output khong ton tai: {path}")
            print(f"[ERR] {name}: {path}")

    try:
        import torch

        if torch.cuda.is_available():
            vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
            if vram_gb >= 8:
                recommended_batch = 20
            elif vram_gb >= 6:
                recommended_batch = 14
            else:
                recommended_batch = 8
            print(f"\nBatch size khuyen nghi cho {vram_gb:.1f}GB VRAM: {recommended_batch}")
    except Exception:
        pass

    print("\n" + "=" * 55)
    if errors:
        print(f"[ERR] {len(errors)} loi can sua truoc khi train:")
        for error in errors:
            print(f"   -> {error}")
    if warnings:
        print(f"[WARN] {len(warnings)} canh bao:")
        for warning in warnings:
            print(f"   -> {warning}")
    if not errors and not warnings:
        print("Moi truong san sang! Co the bat dau training.")
    elif not errors:
        print("[OK] Khong co loi nghiem trong. Xem warnings o tren.")


if __name__ == "__main__":
    check_all()
