import os
from pathlib import Path


def _to_bool(raw: str, default: bool = False) -> bool:
    value = (raw or "").strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return default


def _to_int(raw: str, default: int, min_value: int | None = None) -> int:
    try:
        value = int(str(raw).strip())
    except Exception:
        value = int(default)

    if min_value is not None:
        value = max(int(min_value), value)
    return value


def _to_csv_list(raw: str) -> list[str]:
    text = (raw or "").strip()
    if not text:
        return []
    items = [part.strip() for part in text.split(",")]
    return [item for item in items if item]


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent.parent

PLANT_MODEL_PATH = Path(os.getenv("PLANT_MODEL_PATH", BASE_DIR / "models" / "plant_mobilenetv3.pt"))
DISEASE_MODEL_PATH = Path(os.getenv("DISEASE_MODEL_PATH", BASE_DIR / "models" / "disease_mobilenetv3.pt"))

PLANT_BACKBONE = os.getenv("PLANT_BACKBONE", "large").strip().lower()
DISEASE_BACKBONE = os.getenv("DISEASE_BACKBONE", "large").strip().lower()

PLANT_LABELS_PATH = Path(os.getenv("PLANT_LABELS_PATH", BASE_DIR / "labels" / "plant_labels.json"))
DISEASE_LABELS_PATH = Path(os.getenv("DISEASE_LABELS_PATH", BASE_DIR / "labels" / "disease_labels_flat.json"))
DISEASE_MAP_PATH = Path(os.getenv("DISEASE_MAP_PATH", BASE_DIR / "labels" / "disease_labels_by_plant.json"))
RECOMMENDATION_PATH = Path(os.getenv("RECOMMENDATION_PATH", BASE_DIR / "labels" / "recommendations_vi.json"))

DEVICE = os.getenv("DEVICE", "auto").strip().lower()
PLANT_THRESHOLD = float(os.getenv("PLANT_THRESHOLD", "0.70"))
DISEASE_THRESHOLD = float(os.getenv("DISEASE_THRESHOLD", "0.60"))
PLANT_GATE_CONFIDENCE = float(os.getenv("PLANT_GATE_CONFIDENCE", "0.90"))
PLANT_GATE_MARGIN = float(os.getenv("PLANT_GATE_MARGIN", "0.12"))
STEP1_MAX_LEAF_CANDIDATES = int(os.getenv("STEP1_MAX_LEAF_CANDIDATES", "2"))
STEP1_MIN_DOMINANT_LEAF_RATIO = float(os.getenv("STEP1_MIN_DOMINANT_LEAF_RATIO", "0.12"))

UPLOAD_ARCHIVE_ENABLED = _to_bool(os.getenv("UPLOAD_ARCHIVE_ENABLED", "1"), default=True)
UPLOAD_ARCHIVE_DIR = Path(os.getenv("UPLOAD_ARCHIVE_DIR", BASE_DIR / "upload_archive"))
UPLOAD_MAX_IMAGE_BYTES = max(256 * 1024, int(os.getenv("UPLOAD_MAX_IMAGE_BYTES", str(8 * 1024 * 1024))))
STEP2_MAX_FILES = max(1, int(os.getenv("STEP2_MAX_FILES", "6")))
STEP2_MAX_TOTAL_BYTES = max(
    UPLOAD_MAX_IMAGE_BYTES,
    int(os.getenv("STEP2_MAX_TOTAL_BYTES", str(24 * 1024 * 1024))),
)

FRONTEND_DIR = PROJECT_DIR / "frontend"
INDEX_FILE = FRONTEND_DIR / "index.html"

# --- Security / Hardening knobs ---

# CORS
ALLOWED_ORIGINS = _to_csv_list(os.getenv("ALLOWED_ORIGINS", ""))
ALLOWED_ORIGIN_REGEX = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
).strip() or None

# Flow policy
ENABLE_LEGACY_PREDICT_ENDPOINT = _to_bool(os.getenv("ENABLE_LEGACY_PREDICT_ENDPOINT", "0"), default=False)
REQUIRE_STEP2_FLOW_TOKEN = _to_bool(os.getenv("REQUIRE_STEP2_FLOW_TOKEN", "1"), default=True)
STEP2_FLOW_TOKEN_SECRET = os.getenv("STEP2_FLOW_TOKEN_SECRET", "").strip()
STEP2_FLOW_TOKEN_TTL_SEC = _to_int(os.getenv("STEP2_FLOW_TOKEN_TTL_SEC", "900"), 900, min_value=60)
STEP2_FLOW_TOKEN_BIND_IP = _to_bool(os.getenv("STEP2_FLOW_TOKEN_BIND_IP", "0"), default=False)

# Runtime protection
INFERENCE_MAX_CONCURRENCY = _to_int(os.getenv("INFERENCE_MAX_CONCURRENCY", "2"), 2, min_value=1)
RATE_LIMIT_WINDOW_SEC = _to_int(os.getenv("RATE_LIMIT_WINDOW_SEC", "60"), 60, min_value=1)
RATE_LIMIT_MAX_REQUESTS = _to_int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "60"), 60, min_value=1)
RATE_LIMIT_CLEANUP_INTERVAL_SEC = _to_int(
    os.getenv("RATE_LIMIT_CLEANUP_INTERVAL_SEC", str(RATE_LIMIT_WINDOW_SEC)),
    RATE_LIMIT_WINDOW_SEC,
    min_value=1,
)

# Proxy/IP handling
# If you're running behind Nginx, enable this so rate limiting and optional token IP-binding
# can use X-Real-IP / X-Forwarded-For.
TRUST_PROXY_HEADERS = _to_bool(os.getenv("TRUST_PROXY_HEADERS", "0"), default=False)

# Image decode guards (helps against oversized images / decompression bombs)
MAX_IMAGE_WIDTH = _to_int(os.getenv("MAX_IMAGE_WIDTH", "6000"), 6000, min_value=64)
MAX_IMAGE_HEIGHT = _to_int(os.getenv("MAX_IMAGE_HEIGHT", "6000"), 6000, min_value=64)
MAX_IMAGE_PIXELS = _to_int(os.getenv("MAX_IMAGE_PIXELS", str(25_000_000)), 25_000_000, min_value=64 * 64)

# Step2 additional safety
STEP2_STRICT_PLANT_MATCH = _to_bool(os.getenv("STEP2_STRICT_PLANT_MATCH", "1"), default=True)
