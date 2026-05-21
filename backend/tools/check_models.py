import traceback
from pathlib import Path

BASE = Path(__file__).parents[1]
CANDIDATES = [
    BASE / "models",
    BASE / "app" / "models",
]

import sys

print("Python executable:", sys.executable)

found_any = False
for base in CANDIDATES:
    print("\n-- scanning base:", base)
    plant = base / "plant_mobilenetv3.pt"
    disease = base / "disease_mobilenetv3.pt"
    for p in (plant, disease):
        print("\n==== Checking:", p)
        if not p.exists():
            print("Missing file:", p)
            continue

        found_any = True

    try:
        import torch
        print("- torch version:", torch.__version__)
    except Exception as e:
        print("- Could not import torch:", e)
        continue

    # Try jit.load
    try:
        print("- Trying torch.jit.load(..., map_location='cpu')")
        m = torch.jit.load(str(p), map_location='cpu')
        print("  jit.load succeeded; type:", type(m))
    except Exception as e:
        print("  jit.load failed:")
        traceback.print_exc()

    # Try torch.load
    try:
        print("- Trying torch.load(..., map_location='cpu')")
        obj = torch.load(str(p), map_location='cpu')
        print("  torch.load succeeded; type:", type(obj))
        if isinstance(obj, dict):
            print("  dict keys:", list(obj.keys())[:50])
        try:
            import torch.nn as nn
            if isinstance(obj, nn.Module):
                print("  object is an nn.Module")
        except Exception:
            pass
    except Exception as e:
        print("  torch.load failed:")
        traceback.print_exc()

if not found_any:
    print("\nNo model files found in any candidate locations.")

print("\nDone.")
