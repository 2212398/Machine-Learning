import argparse
import json
import sys
import traceback
from pathlib import Path


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check whether backend model files can be loaded by torch.")
    parser.add_argument(
        "--base",
        type=Path,
        action="append",
        default=None,
        help="Model directory to scan. Can be passed multiple times.",
    )
    parser.add_argument("--include-legacy", action="store_true", help="Also scan legacy backend/models.")
    parser.add_argument("--plant-labels", type=Path, default=None, help="Plant labels JSON for class-count checks.")
    parser.add_argument("--disease-labels", type=Path, default=None, help="Disease labels JSON for class-count checks.")
    parser.add_argument("--verbose-errors", action="store_true", help="Print full tracebacks for load failures.")
    return parser.parse_args()


def print_error(exc: Exception, *, verbose: bool) -> None:
    if verbose:
        traceback.print_exc()
    else:
        print(f"  {type(exc).__name__}: {exc}")


def load_label_count(path: Path | None) -> int | None:
    if path is None:
        return None
    if not path.exists():
        print(f"Label file missing: {path}")
        return None
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict):
        return len(data)
    raise ValueError(f"Unsupported label JSON format: {path}")


def infer_state_dict_num_classes(obj) -> int | None:
    try:
        import torch
        import torch.nn as nn
    except Exception:
        return None

    if isinstance(obj, nn.Module):
        for module in reversed(list(obj.modules())):
            if isinstance(module, nn.Linear):
                return int(module.out_features)

    if not isinstance(obj, dict):
        return None

    state_dict = obj
    for key in ("state_dict", "model_state_dict", "model", "net"):
        value = obj.get(key)
        if isinstance(value, dict):
            state_dict = value
            break

    classifier_weights = []
    for key, value in state_dict.items():
        if not isinstance(key, str):
            continue
        if "classifier" not in key or not key.endswith(".weight"):
            continue
        if isinstance(value, torch.Tensor) and value.ndim == 2:
            classifier_weights.append((key, int(value.shape[0])))

    if classifier_weights:
        classifier_weights.sort()
        return classifier_weights[-1][1]

    return None


def check_class_count(path: Path, obj, expected_labels: int | None) -> bool:
    if expected_labels is None:
        return True

    model_classes = infer_state_dict_num_classes(obj)
    if model_classes is None:
        print("  class-count check: skipped (could not infer output layer size)")
        return True

    if model_classes != expected_labels:
        print(
            f"  class-count check: FAILED model_outputs={model_classes} labels={expected_labels}"
        )
        return False

    print(f"  class-count check: OK model_outputs={model_classes} labels={expected_labels}")
    return True


def check_model(path: Path, *, verbose_errors: bool, expected_labels: int | None = None) -> bool:
    print(f"\n==== Checking: {path}")
    if not path.exists():
        print(f"Missing file: {path}")
        return False

    try:
        import torch
    except Exception as exc:
        print(f"Could not import torch: {exc}")
        return False

    ok = False
    count_ok = True
    print(f"- torch version: {torch.__version__}")

    try:
        print("- Trying torch.jit.load(..., map_location='cpu')")
        model = torch.jit.load(str(path), map_location="cpu")
        print(f"  jit.load succeeded; type: {type(model)}")
        count_ok = check_class_count(path, model, expected_labels) and count_ok
        ok = True
    except Exception as exc:
        print("  jit.load failed:")
        print_error(exc, verbose=verbose_errors)

    try:
        print("- Trying torch.load(..., map_location='cpu')")
        obj = torch.load(str(path), map_location="cpu")
        print(f"  torch.load succeeded; type: {type(obj)}")
        if isinstance(obj, dict):
            print(f"  dict keys: {list(obj.keys())[:20]}")
        count_ok = check_class_count(path, obj, expected_labels) and count_ok
        try:
            import torch.nn as nn

            if isinstance(obj, nn.Module):
                print("  object is an nn.Module")
        except Exception:
            pass
        ok = True
    except Exception as exc:
        print("  torch.load failed:")
        print_error(exc, verbose=verbose_errors)

    return ok and count_ok


def main() -> None:
    args = parse_args()
    base = Path(__file__).resolve().parents[1]
    if args.base:
        candidates = args.base
    else:
        candidates = [base / "app" / "models"]
        if args.include_legacy:
            candidates.insert(0, base / "models")

    print(f"Python executable: {sys.executable}")
    labels_dir = base / "app" / "labels"
    plant_label_count = load_label_count(args.plant_labels or labels_dir / "plant_labels.json")
    disease_label_count = load_label_count(args.disease_labels or labels_dir / "disease_labels_flat.json")

    checked = 0
    loaded = 0
    for model_dir in candidates:
        print(f"\n-- scanning base: {model_dir}")
        for path, expected_count in (
            (model_dir / "plant_efficientnet_b4.pt", plant_label_count),
            (model_dir / "disease_efficientnet_b4.pt", disease_label_count),
        ):
            checked += 1
            if check_model(path, verbose_errors=bool(args.verbose_errors), expected_labels=expected_count):
                loaded += 1

    print(f"\nDone. loadable={loaded}/{checked}")
    if loaded != checked:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
