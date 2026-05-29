import asyncio
import base64
import hashlib
import hmac
import io
import json
import logging
import os
import re
import shutil
import threading
import time
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import (
    ALLOWED_ORIGINS,
    ALLOWED_ORIGIN_REGEX,
    DEVICE,
    DISEASE_BACKBONE,
    DISEASE_MAP_PATH,
    DISEASE_MODEL_PATH,
    DISEASE_LABELS_PATH,
    DISEASE_THRESHOLD,
    ENABLE_API_DOCS,
    ENABLE_LEGACY_PREDICT_ENDPOINT,
    FEEDBACK_AGGREGATOR_ENABLED,
    FRONTEND_DIR,
    INDEX_FILE,
    INFERENCE_MAX_CONCURRENCY,
    IMAGE_BLUR_VARIANCE_THRESHOLD,
    MAX_IMAGE_HEIGHT,
    MAX_IMAGE_PIXELS,
    MAX_IMAGE_WIDTH,
    PLANT_BACKBONE,
    PLANT_GATE_CONFIDENCE,
    PLANT_GATE_MARGIN,
    PLANT_MODEL_PATH,
    PLANT_LABELS_PATH,
    PLANT_THRESHOLD,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_CLEANUP_INTERVAL_SEC,
    RATE_LIMIT_WINDOW_SEC,
    RECOMMENDATION_PATH,
    PROJECT_DIR,
    REQUIRE_STEP2_FLOW_TOKEN,
    STEP2_MAX_FILES,
    STEP2_MAX_TOTAL_BYTES,
    STEP2_FLOW_TOKEN_BIND_IP,
    STEP2_FLOW_TOKEN_SECRET,
    STEP2_FLOW_TOKEN_TTL_SEC,
    STEP2_STRICT_PLANT_MATCH,
    STEP1_MAX_LEAF_CANDIDATES,
    STEP1_MIN_DOMINANT_LEAF_RATIO,
    UPLOAD_ARCHIVE_DIR,
    UPLOAD_ARCHIVE_ENABLED,
    UPLOAD_MAX_IMAGE_BYTES,
    TRUST_PROXY_HEADERS,
)
from .inference import PlantDiseasePredictor
from .preprocess import extract_leaf_region, extract_leaf_region_with_stats
from .recommendations import RecommendationEngine
from .schemas import (
    ApiErrorResponse,
    HealthResponse,
    PredictResponse,
    RecommendationResponse,
    Step1PlantResponse,
    Step2DiseaseResponse,
    Step2ImageResult,
)


LOGGER = logging.getLogger(__name__)


INFERENCE_SEMAPHORE = asyncio.Semaphore(INFERENCE_MAX_CONCURRENCY)

_RATE_LIMIT_BUCKETS: defaultdict[str, deque[float]] = defaultdict(deque)
_RATE_LIMIT_LOCK = threading.Lock()
_RATE_LIMIT_LAST_CLEANUP = 0.0

_MANIFEST_APPEND_LOCK = threading.Lock()

if STEP2_FLOW_TOKEN_SECRET:
    _STEP2_TOKEN_SECRET_BYTES = STEP2_FLOW_TOKEN_SECRET.encode("utf-8")
else:
    _STEP2_TOKEN_SECRET_BYTES = os.urandom(32)
    LOGGER.warning("STEP2_FLOW_TOKEN_SECRET is not set; using an ephemeral secret (tokens reset on restart).")

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8"
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png"}
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}
READ_CHUNK_BYTES = 1024 * 1024
MULTIPART_OVERHEAD_BYTES = 1024 * 1024


error_responses = {
    400: {"model": ApiErrorResponse},
    401: {"model": ApiErrorResponse},
    403: {"model": ApiErrorResponse},
    413: {"model": ApiErrorResponse},
    422: {"model": ApiErrorResponse},
    429: {"model": ApiErrorResponse},
    500: {"model": ApiErrorResponse},
    503: {"model": ApiErrorResponse},
}


app = FastAPI(
    title="Plant Leaf Detection API",
    version="2.0.0",
    docs_url="/docs" if ENABLE_API_DOCS else None,
    redoc_url="/redoc" if ENABLE_API_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_API_DOCS else None,
)


def _request_id(request: Request) -> str:
    return request.headers.get("x-request-id") or uuid4().hex


def _error_payload(*, request: Request, status_code: int, message: str, error: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "error",
            "error": error,
            "message": message,
            "request_id": getattr(request.state, "request_id", None),
        },
    )


def _api_error(status_code: int, message: str, error: str = "http_error") -> HTTPException:
    return HTTPException(status_code=status_code, detail=message, headers={"x-error-code": error})


@app.middleware("http")
async def add_request_context(request: Request, call_next):
    request.state.request_id = _request_id(request)
    response = await call_next(request)
    response.headers["x-request-id"] = request.state.request_id
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else json.dumps(exc.detail, ensure_ascii=False)
    return _error_payload(
        request=request,
        status_code=exc.status_code,
        message=detail,
        error=getattr(exc, "headers", None).get("x-error-code", "http_error") if exc.headers else "http_error",
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return _error_payload(
        request=request,
        status_code=422,
        message="Dữ liệu gửi lên không hợp lệ.",
        error="validation_error",
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    LOGGER.exception("Unhandled API error request_id=%s", getattr(request.state, "request_id", None))
    return _error_payload(
        request=request,
        status_code=500,
        message="Lỗi hệ thống. Vui lòng thử lại sau.",
        error="internal_server_error",
    )


# Background feedback aggregation (periodically export feedbacks for retraining)
import time as _time


def _start_feedback_aggregator(interval_sec: int = 60 * 60):
    """Start a background thread that exports feedbacks to a local CSV periodically.

    Requires env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to be set.
    The job writes CSV files under `training/retraining_exports/` in the repo root.
    """
    SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE")
    if not SUPABASE_URL or not SERVICE_ROLE:
        LOGGER.info("Feedback aggregator disabled: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return

    repo_root = PROJECT_DIR
    out_dir = repo_root / "training" / "retraining_exports"
    out_dir.mkdir(parents=True, exist_ok=True)

    headers = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
    endpoint = SUPABASE_URL.rstrip("/") + "/rest/v1/feedbacks"

    def _worker():
        while True:
            try:
                params = {
                    "select": "id,diagnosis_id,user_id,is_correct,note,created_at",
                    "order": "created_at.desc",
                }
                query = urllib.parse.urlencode(params)
                request_url = f"{endpoint}?{query}"
                req = urllib.request.Request(request_url, headers=headers)
                with urllib.request.urlopen(req, timeout=30) as response:
                    records = json.loads(response.read().decode("utf-8"))
                    diagnosis_ids = sorted({str(rec.get("diagnosis_id") or "") for rec in records if rec.get("diagnosis_id")})
                    diagnosis_map: dict[str, dict[str, Any]] = {}
                    if diagnosis_ids:
                        diag_params = {
                            "select": "id,image_url,plant_label,disease_label,plant_confidence,disease_confidence",
                            "id": f"in.({','.join(diagnosis_ids)})",
                        }
                        diag_query = urllib.parse.urlencode(diag_params)
                        diag_request_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/diagnoses?{diag_query}"
                        diag_req = urllib.request.Request(diag_request_url, headers=headers)
                        with urllib.request.urlopen(diag_req, timeout=30) as diag_response:
                            diag_records = json.loads(diag_response.read().decode("utf-8"))
                            diagnosis_map = {str(rec.get("id") or ""): rec for rec in diag_records}

                    now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
                    out_file = out_dir / f"feedbacks_export_{now}.csv"
                    import csv

                    with out_file.open("w", newline="", encoding="utf-8") as fh:
                        w = csv.writer(fh)
                        w.writerow(["image_url","plant_label","disease_label","plant_confidence","disease_confidence","user_id","is_correct","note","feedback_created_at","diagnosis_id"])
                        for rec in records:
                            diagnosis = diagnosis_map.get(str(rec.get("diagnosis_id") or ""), {})
                            w.writerow([
                                diagnosis.get("image_url") or "",
                                diagnosis.get("plant_label") or "",
                                diagnosis.get("disease_label") or "",
                                diagnosis.get("plant_confidence") or "",
                                diagnosis.get("disease_confidence") or "",
                                rec.get("user_id") or "",
                                rec.get("is_correct") or False,
                                (rec.get("note") or "").replace("\n", " "),
                                rec.get("created_at") or "",
                                rec.get("diagnosis_id") or "",
                            ])
                    LOGGER.info("Wrote feedback export: %s", str(out_file))
            except Exception:
                LOGGER.exception("Feedback aggregator encountered an error")

            _time.sleep(interval_sec)

    t = threading.Thread(target=_worker, daemon=True, name="feedback-aggregator")
    t.start()


@app.on_event("startup")
def _maybe_start_aggregator():
    if not FEEDBACK_AGGREGATOR_ENABLED:
        LOGGER.info("Feedback aggregator disabled: FEEDBACK_AGGREGATOR_ENABLED is not set")
        return

    # Start aggregator with 1 hour interval by default only when retraining export is explicit.
    try:
        _start_feedback_aggregator(interval_sec=int(os.getenv("FEEDBACK_AGGREGATOR_INTERVAL", 60 * 60)))
    except Exception:
        LOGGER.exception("Failed to start feedback aggregator")

cors_allow_origins = ALLOWED_ORIGINS or []
cors_allow_origin_regex = ALLOWED_ORIGIN_REGEX
cors_allow_credentials = True
if "*" in cors_allow_origins:
    cors_allow_credentials = False
    cors_allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_origin_regex=cors_allow_origin_regex,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = PlantDiseasePredictor(
    plant_model_path=PLANT_MODEL_PATH,
    disease_model_path=DISEASE_MODEL_PATH,
    plant_backbone=PLANT_BACKBONE,
    disease_backbone=DISEASE_BACKBONE,
    plant_labels_path=PLANT_LABELS_PATH,
    disease_labels_path=DISEASE_LABELS_PATH,
    disease_map_path=DISEASE_MAP_PATH,
    device=DEVICE,
    plant_threshold=PLANT_THRESHOLD,
    plant_gate_confidence=PLANT_GATE_CONFIDENCE,
    plant_gate_margin=PLANT_GATE_MARGIN,
    disease_threshold=DISEASE_THRESHOLD,
)

recommender = RecommendationEngine(RECOMMENDATION_PATH)

if UPLOAD_ARCHIVE_ENABLED:
    UPLOAD_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/", include_in_schema=False)
def index():
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    raise HTTPException(status_code=404, detail="Frontend index file not found")


@app.get("/api/health", response_model=HealthResponse, responses=error_responses)
def health():
    return {
        "status": "ok",
        "model_loaded": predictor.model_loaded,
        "plant_model_loaded": predictor.plant_model is not None,
        "disease_model_loaded": predictor.disease_model is not None,
        "device": predictor.device,
        "legacy_predict_enabled": ENABLE_LEGACY_PREDICT_ENDPOINT,
        "require_step2_flow_token": REQUIRE_STEP2_FLOW_TOKEN,
        "step2_token_ttl_sec": STEP2_FLOW_TOKEN_TTL_SEC,
        "step2_token_bind_ip": STEP2_FLOW_TOKEN_BIND_IP,
        "inference_max_concurrency": INFERENCE_MAX_CONCURRENCY,
        "rate_limit_window_sec": RATE_LIMIT_WINDOW_SEC,
        "rate_limit_max_requests": RATE_LIMIT_MAX_REQUESTS,
        "max_image_width": MAX_IMAGE_WIDTH,
        "max_image_height": MAX_IMAGE_HEIGHT,
        "max_image_pixels": MAX_IMAGE_PIXELS,
        "image_blur_variance_threshold": IMAGE_BLUR_VARIANCE_THRESHOLD,
        "step2_strict_plant_match": STEP2_STRICT_PLANT_MATCH,
        "upload_archive_enabled": UPLOAD_ARCHIVE_ENABLED,
        "upload_archive_dir": "configured" if UPLOAD_ARCHIVE_ENABLED else "disabled",  # Avoid leaking server filesystem paths.
        "upload_max_image_mb": round(UPLOAD_MAX_IMAGE_BYTES / (1024 * 1024), 2),
        "step2_max_files": STEP2_MAX_FILES,
        "step2_max_total_mb": round(STEP2_MAX_TOTAL_BYTES / (1024 * 1024), 2),
    }


@app.get("/api/recommendation", response_model=RecommendationResponse, responses=error_responses)
def get_recommendation(disease_label: str, plant_label: str):
    """Return a short recommendation summary and checklist for a diagnosis.

    Query params:
    - disease_label: disease label (e.g. Tomato___Early_blight)
    - plant_label: plant label (e.g. Tomato)
    """
    try:
        recommendation = recommender.get(disease_label=disease_label, plant_label=plant_label)
        checklist = recommender.get_checklist(disease_label=disease_label, plant_label=plant_label)
        if isinstance(recommendation, dict):
            summary = recommendation.get("ten_benh") or recommendation.get("trieu_chung") or ""
        else:
            summary = recommendation
        return {"summary": summary, "recommendation": recommendation, "checklist": checklist}
    except Exception:
        raise HTTPException(status_code=500, detail="Không thể lấy khuyến nghị lúc này.")


def _client_ip_from_request(request: Request) -> str:
    if TRUST_PROXY_HEADERS:
        xri = request.headers.get("x-real-ip")
        if xri:
            return xri.strip() or "unknown"

        xff = request.headers.get("x-forwarded-for")
        if xff:
            parts = [p.strip() for p in xff.split(",") if p.strip()]
            if parts:
                # Prefer the last hop to reduce spoofing when proxies append via $proxy_add_x_forwarded_for.
                return parts[-1]

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def _maybe_cleanup_rate_limit_buckets(now: float) -> None:
    global _RATE_LIMIT_LAST_CLEANUP

    interval = float(RATE_LIMIT_CLEANUP_INTERVAL_SEC)
    if interval <= 0:
        return

    if (now - _RATE_LIMIT_LAST_CLEANUP) < interval:
        return

    cutoff = now - float(RATE_LIMIT_WINDOW_SEC)
    keys_to_delete: list[str] = []
    for key, bucket in _RATE_LIMIT_BUCKETS.items():
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if not bucket:
            keys_to_delete.append(key)

    for key in keys_to_delete:
        _RATE_LIMIT_BUCKETS.pop(key, None)

    _RATE_LIMIT_LAST_CLEANUP = now


def _enforce_rate_limit(request: Request, endpoint: str) -> None:
    # Per-endpoint sliding window keyed by client IP; protects CPU-heavy AI routes from bursts.
    now = time.time()
    ip = _client_ip_from_request(request)
    key = f"{endpoint}|{ip}"

    with _RATE_LIMIT_LOCK:
        _maybe_cleanup_rate_limit_buckets(now)
        bucket = _RATE_LIMIT_BUCKETS[key]
        cutoff = now - float(RATE_LIMIT_WINDOW_SEC)
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= int(RATE_LIMIT_MAX_REQUESTS):
            raise _api_error(
                429,
                (
                    f"Quá nhiều yêu cầu. Hãy thử lại sau {RATE_LIMIT_WINDOW_SEC}s "
                    f"(giới hạn {RATE_LIMIT_MAX_REQUESTS} req/{RATE_LIMIT_WINDOW_SEC}s)."
                ),
                "rate_limited",
            )

        bucket.append(now)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(text: str) -> bytes:
    raw = (text or "").encode("ascii")
    pad_len = (-len(raw)) % 4
    raw += b"=" * pad_len
    return base64.urlsafe_b64decode(raw)


def _sign_step2_token_payload(payload_bytes: bytes) -> bytes:
    return hmac.new(_STEP2_TOKEN_SECRET_BYTES, payload_bytes, hashlib.sha256).digest()


def _issue_step2_access_token(*, request: Request, allowed_plants: list[str]) -> tuple[str | None, int | None]:
    plants = [p for p in allowed_plants if p and p != "unknown_plant"]
    plants = list(dict.fromkeys(plants))
    if not plants:
        return None, None

    now = int(time.time())
    payload: dict[str, Any] = {
        "v": 1,
        "iat": now,
        "exp": now + int(STEP2_FLOW_TOKEN_TTL_SEC),
        "allowed_plants": plants,
    }
    if STEP2_FLOW_TOKEN_BIND_IP:
        payload["ip"] = _client_ip_from_request(request)

    payload_bytes = json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    sig_bytes = _sign_step2_token_payload(payload_bytes)

    token = f"{_b64url_encode(payload_bytes)}.{_b64url_encode(sig_bytes)}"
    return token, int(STEP2_FLOW_TOKEN_TTL_SEC)


def _verify_step2_access_token(*, token: str | None, request: Request) -> dict[str, Any]:
    if not token:
        raise _api_error(401, "Thiếu token hợp lệ cho Bước 2. Hãy chạy Bước 1 lại.", "missing_step2_token")

    parts = token.split(".")
    if len(parts) != 2:
        raise _api_error(401, "Token Bước 2 không hợp lệ. Hãy chạy Bước 1 lại.", "invalid_step2_token")

    try:
        payload_bytes = _b64url_decode(parts[0])
        sig_bytes = _b64url_decode(parts[1])
    except Exception:
        raise _api_error(401, "Token Bước 2 không hợp lệ. Hãy chạy Bước 1 lại.", "invalid_step2_token")

    # HMAC signature prevents users from widening the allowed plant list client-side.
    expected_sig = _sign_step2_token_payload(payload_bytes)
    if not hmac.compare_digest(expected_sig, sig_bytes):
        raise _api_error(401, "Token Bước 2 không hợp lệ. Hãy chạy Bước 1 lại.", "invalid_step2_token")

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        raise _api_error(401, "Token Bước 2 không hợp lệ. Hãy chạy Bước 1 lại.", "invalid_step2_token")

    if not isinstance(payload, dict):
        raise _api_error(401, "Token Bước 2 không hợp lệ. Hãy chạy Bước 1 lại.", "invalid_step2_token")

    exp = int(payload.get("exp") or 0)
    if exp <= int(time.time()):
        raise _api_error(401, "Token Bước 2 đã hết hạn. Hãy chạy Bước 1 lại.", "expired_step2_token")

    if STEP2_FLOW_TOKEN_BIND_IP:
        token_ip = str(payload.get("ip") or "")
        req_ip = _client_ip_from_request(request)
        if token_ip and token_ip != req_ip:
            raise _api_error(403, "Token Bước 2 không khớp IP. Hãy chạy Bước 1 lại.", "step2_token_ip_mismatch")

    allowed_plants = payload.get("allowed_plants")
    if not isinstance(allowed_plants, list) or not all(isinstance(x, str) for x in allowed_plants):
        raise _api_error(401, "Token Bước 2 không hợp lệ. Hãy chạy Bước 1 lại.", "invalid_step2_token")

    return payload


def _is_probably_image_bytes(raw_bytes: bytes) -> bool:
    if raw_bytes.startswith(b"\xff\xd8\xff"):
        return True
    if raw_bytes.startswith(PNG_MAGIC):
        return True
    return False


def _enforce_request_content_length(request: Request, max_bytes: int) -> None:
    raw_length = request.headers.get("content-length")
    if not raw_length:
        return

    try:
        content_length = int(raw_length)
    except ValueError:
        raise _api_error(400, "Header Content-Length không hợp lệ.", "invalid_content_length")

    if content_length > max_bytes:
        raise _api_error(
            413,
            f"Dung lượng request vượt giới hạn {_to_mb_text(max_bytes)}.",
            "request_too_large",
        )


def _enforce_upload_metadata(file: UploadFile) -> None:
    # MIME + extension checks fail fast before reading the whole body into memory.
    content_type = (file.content_type or "").lower()
    suffix = Path(file.filename or "").suffix.lower()

    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise _api_error(400, "Chỉ chấp nhận ảnh JPG/JPEG hoặc PNG.", "invalid_file_type")

    if suffix and suffix not in ALLOWED_IMAGE_SUFFIXES:
        raise _api_error(400, "Phần mở rộng file không hợp lệ. Chỉ nhận .jpg, .jpeg, .png.", "invalid_file_extension")


def _try_parse_image_size(raw_bytes: bytes) -> tuple[int | None, int | None]:
    try:
        if raw_bytes.startswith(PNG_MAGIC) and len(raw_bytes) >= 24 and raw_bytes[12:16] == b"IHDR":
            width = int.from_bytes(raw_bytes[16:20], "big")
            height = int.from_bytes(raw_bytes[20:24], "big")
            return width, height

        if raw_bytes.startswith(JPEG_MAGIC):
            sof_markers = {
                0xC0,
                0xC1,
                0xC2,
                0xC3,
                0xC5,
                0xC6,
                0xC7,
                0xC9,
                0xCA,
                0xCB,
                0xCD,
                0xCE,
                0xCF,
            }
            idx = 2
            length = len(raw_bytes)
            while idx + 1 < length:
                if raw_bytes[idx] != 0xFF:
                    idx += 1
                    continue

                while idx < length and raw_bytes[idx] == 0xFF:
                    idx += 1
                if idx >= length:
                    break

                marker = raw_bytes[idx]
                idx += 1

                if marker in {0xD9, 0xDA}:
                    break

                if marker == 0x01 or 0xD0 <= marker <= 0xD7:
                    continue

                if idx + 1 >= length:
                    break
                seg_len = int.from_bytes(raw_bytes[idx : idx + 2], "big")
                if seg_len < 2:
                    break
                seg_data = idx + 2
                seg_end = seg_data + seg_len - 2
                if seg_end > length:
                    break

                if marker in sof_markers and seg_len >= 7:
                    height = int.from_bytes(raw_bytes[seg_data + 1 : seg_data + 3], "big")
                    width = int.from_bytes(raw_bytes[seg_data + 3 : seg_data + 5], "big")
                    return width, height

                idx = seg_end

        if raw_bytes.startswith(b"BM") and len(raw_bytes) >= 26:
            width = int.from_bytes(raw_bytes[18:22], "little", signed=True)
            height = int.from_bytes(raw_bytes[22:26], "little", signed=True)
            return abs(width), abs(height)

        if len(raw_bytes) >= 30 and raw_bytes[0:4] == b"RIFF" and raw_bytes[8:12] == b"WEBP":
            fourcc = raw_bytes[12:16]
            if fourcc == b"VP8X":
                width = 1 + int.from_bytes(raw_bytes[24:27], "little")
                height = 1 + int.from_bytes(raw_bytes[27:30], "little")
                return width, height
    except Exception:
        return None, None

    return None, None


def _enforce_image_limits(width: int, height: int) -> None:
    if width <= 0 or height <= 0:
        raise _api_error(400, "Không xác định được kích thước ảnh hợp lệ.", "invalid_image_dimensions")

    if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT or (width * height) > MAX_IMAGE_PIXELS:
        raise _api_error(
            413,
            (
                "Ảnh quá lớn. "
                f"Giới hạn {MAX_IMAGE_WIDTH}x{MAX_IMAGE_HEIGHT} và {MAX_IMAGE_PIXELS} pixels." 
            ),
            "image_dimensions_too_large",
        )


def _to_mb_text(byte_size: int) -> str:
    return f"{byte_size / (1024 * 1024):.1f}MB"


def _sanitize_upload_filename(filename: str | None) -> str:
    name = (filename or "upload.jpg").strip()
    suffix = Path(name).suffix.lower()
    stem = Path(name).stem

    clean_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._")
    if not clean_stem:
        clean_stem = "upload"
    if len(clean_stem) > 60:
        clean_stem = clean_stem[:60]

    if suffix not in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
        suffix = ".bin"

    return f"{clean_stem}{suffix}"


def _scope_bucket_from_prediction(prediction: dict[str, Any]) -> str:
    status = str(prediction.get("status", "")).lower()
    plant_label = str(prediction.get("plant_label", "unknown_plant"))
    leaf_detected = bool(prediction.get("leaf_detected", False))

    if status in {
        "invalid_file",
        "file_too_large",
        "invalid_image",
        "leaf_not_found",
        "too_many_leaves",
        "batch_total_too_large",
    }:
        return "other"

    if plant_label != "unknown_plant":
        return "in_scope"

    if leaf_detected:
        return "out_of_scope"

    return "other"


def _archive_upload(flow: str, filename: str | None, raw_bytes: bytes, captured_at: datetime) -> Path | None:
    if not UPLOAD_ARCHIVE_ENABLED:
        return None

    day_dir = UPLOAD_ARCHIVE_DIR / "raw" / flow / captured_at.strftime("%Y%m%d")
    day_dir.mkdir(parents=True, exist_ok=True)

    safe_name = _sanitize_upload_filename(filename)
    unique_prefix = f"{captured_at.strftime('%H%M%S_%f')}_{uuid4().hex[:8]}"
    out_path = day_dir / f"{unique_prefix}_{safe_name}"

    try:
        out_path.write_bytes(raw_bytes)
        return out_path
    except Exception as exc:
        LOGGER.warning("Could not archive uploaded file %s: %s", filename, exc)
        return None


def _link_scoped_image(raw_path: Path, scope_bucket: str, captured_at: datetime) -> Path | None:
    scoped_dir = UPLOAD_ARCHIVE_DIR / "scoped" / scope_bucket / captured_at.strftime("%Y%m%d")
    scoped_dir.mkdir(parents=True, exist_ok=True)
    scoped_path = scoped_dir / raw_path.name

    try:
        if scoped_path.exists():
            scoped_path.unlink()
        scoped_path.hardlink_to(raw_path)
        return scoped_path
    except OSError:
        pass

    try:
        shutil.copy2(raw_path, scoped_path)
        return scoped_path
    except Exception as exc:
        LOGGER.warning("Could not create scoped copy for %s: %s", raw_path, exc)
        return None


def _append_manifest_record(record: dict[str, Any], captured_at: datetime) -> None:
    manifest_dir = UPLOAD_ARCHIVE_DIR / "manifests" / captured_at.strftime("%Y%m%d")
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = manifest_dir / "records.jsonl"

    try:
        with _MANIFEST_APPEND_LOCK:
            with manifest_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=True) + "\n")
    except Exception as exc:
        LOGGER.warning("Could not append manifest record: %s", exc)


def _archive_with_metadata(
    flow: str,
    endpoint: str,
    filename: str | None,
    raw_bytes: bytes,
    prediction: dict[str, Any],
    extra: dict[str, Any] | None = None,
) -> None:
    if not UPLOAD_ARCHIVE_ENABLED:
        return

    captured_at = datetime.utcnow()
    raw_path = _archive_upload(flow=flow, filename=filename, raw_bytes=raw_bytes, captured_at=captured_at)
    if raw_path is None:
        return

    scope_bucket = _scope_bucket_from_prediction(prediction)
    scoped_path = _link_scoped_image(raw_path=raw_path, scope_bucket=scope_bucket, captured_at=captured_at)

    record = {
        "captured_at_utc": captured_at.isoformat(timespec="seconds") + "Z",
        "endpoint": endpoint,
        "flow": flow,
        "scope_bucket": scope_bucket,
        "raw_image_path": str(raw_path),
        "scoped_image_path": str(scoped_path) if scoped_path else None,
        "prediction": prediction,
        "extra": extra or {},
    }

    sidecar_path = Path(str(raw_path) + ".json")
    try:
        sidecar_path.write_text(json.dumps(record, ensure_ascii=True, indent=2), encoding="utf-8")
    except Exception as exc:
        LOGGER.warning("Could not write sidecar metadata %s: %s", sidecar_path, exc)

    _append_manifest_record(record=record, captured_at=captured_at)


async def _read_upload_bytes_with_limit(file: UploadFile) -> bytes:
    total_bytes = 0
    chunks: list[bytes] = []

    while True:
        chunk = await file.read(READ_CHUNK_BYTES)
        if not chunk:
            break

        total_bytes += len(chunk)
        if total_bytes > UPLOAD_MAX_IMAGE_BYTES:
            raise _api_error(
                413,
                f"Kích thước ảnh vượt giới hạn {_to_mb_text(UPLOAD_MAX_IMAGE_BYTES)}.",
                "file_too_large",
            )

        chunks.append(chunk)

    if total_bytes <= 0:
        raise _api_error(400, "File ảnh rỗng.", "empty_file")

    return b"".join(chunks)


def _decode_image_bytes(raw_bytes: bytes) -> np.ndarray:
    if not _is_probably_image_bytes(raw_bytes):
        raise _api_error(400, "File tải lên không đúng định dạng ảnh JPG/PNG hợp lệ.", "invalid_image_magic")

    parsed_w, parsed_h = _try_parse_image_size(raw_bytes)
    if parsed_w is not None and parsed_h is not None:
        _enforce_image_limits(parsed_w, parsed_h)

    image: np.ndarray | None = None

    # Prefer Pillow decode to handle EXIF orientation (common on phone photos).
    try:
        from PIL import Image, ImageOps

        Image.MAX_IMAGE_PIXELS = int(MAX_IMAGE_PIXELS)
        with Image.open(io.BytesIO(raw_bytes)) as pil_img:
            pil_img = ImageOps.exif_transpose(pil_img)
            pil_img = pil_img.convert("RGB")
            rgb = np.ascontiguousarray(np.asarray(pil_img))
        if rgb is not None and isinstance(rgb, np.ndarray) and rgb.size > 0:
            image = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception:
        image = None

    if image is None:
        np_img = np.frombuffer(raw_bytes, dtype=np.uint8)
        image = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    if image is None:
        raise _api_error(400, "Không đọc được ảnh. Vui lòng thử lại.", "image_decode_failed")

    height, width = image.shape[:2]
    _enforce_image_limits(width, height)

    return image


def _laplacian_variance(image: np.ndarray) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _enforce_not_blurry(image: np.ndarray) -> None:
    threshold = float(IMAGE_BLUR_VARIANCE_THRESHOLD)
    if threshold <= 0:
        return

    blur_score = _laplacian_variance(image)
    if blur_score < threshold:
        raise _api_error(
            422,
            (
                "Ảnh quá mờ để chẩn đoán tin cậy. "
                f"Hãy chụp lại rõ hơn (blur_score={blur_score:.1f}, threshold={threshold:.1f})."
            ),
            "image_too_blurry",
        )


async def _decode_upload_image(file: UploadFile, flow: str, endpoint: str) -> tuple[np.ndarray, bytes]:
    _enforce_upload_metadata(file)

    raw_bytes = await _read_upload_bytes_with_limit(file)
    try:
        image = await asyncio.to_thread(_decode_image_bytes, raw_bytes)
        await asyncio.to_thread(_enforce_not_blurry, image)
    except HTTPException as exc:
        _archive_with_metadata(
            flow=flow,
            endpoint=endpoint,
            filename=file.filename,
            raw_bytes=raw_bytes,
            prediction={
                "status": "invalid_image",
                "plant_label": "unknown_plant",
                "disease_label": "unknown_plant___unknown_disease",
                "leaf_detected": False,
                "model_predicted": False,
            },
            extra={
                "error": str(exc.detail),
            },
        )
        raise

    return image, raw_bytes


def _run_step2_single_image(*, raw_bytes: bytes, resolved_plant: str) -> dict[str, Any]:
    image = _decode_image_bytes(raw_bytes)
    _enforce_not_blurry(image)

    processed_image, leaf_found = extract_leaf_region(image)
    if not leaf_found:
        return {
            "leaf_detected": False,
            "status": "leaf_not_found",
            "message": "Không phát hiện được lá cây",
            "disease_label": f"{resolved_plant}___unknown_disease",
            "disease_confidence": 0.0,
            "inconsistent": False,
            "skipped": True,
            "plant_mismatch": False,
            "detected_plant_label": None,
            "detected_plant_confidence": None,
            "step2_allowed_classes": 0,
        }

    plant_match = predictor.validate_step2_plant_match(
        image=processed_image,
        confirmed_plant_label=resolved_plant,
    )

    detected_plant = str(plant_match.get("detected_plant_label", "unknown_plant"))
    detected_conf = float(plant_match.get("detected_plant_confidence", 0.0))
    detected_margin = float(plant_match.get("detected_top1_top2_margin", 0.0))
    confident_detection = bool(plant_match.get("confident_detection", False))

    if bool(plant_match.get("mismatch", False)):
        mismatch_message = (
            "Ảnh không khớp loại cây đã xác nhận ở Bước 1. "
            f"Ảnh này gần với cây '{detected_plant}' ({detected_conf * 100:.1f}%)."
        )

        return {
            "leaf_detected": True,
            "status": "plant_mismatch",
            "message": mismatch_message,
            "disease_label": f"{resolved_plant}___unknown_disease",
            "disease_confidence": 0.0,
            "inconsistent": True,
            "skipped": True,
            "plant_mismatch": True,
            "detected_plant_label": detected_plant,
            "detected_plant_confidence": round(detected_conf, 4),
            "step2_allowed_classes": 0,
        }

    # Reduce false rejects: if the plant model's top-1 still matches the confirmed plant,
    # we allow Step2 to proceed even when confidence/margin are low.
    if STEP2_STRICT_PLANT_MATCH and detected_plant != resolved_plant:
        if detected_plant == "unknown_plant":
            unverified_message = (
                "Không đủ tin cậy để xác minh loại cây của ảnh này theo Bước 1. "
                "Hãy chụp/crop lại rõ 1 lá rồi thử lại."
            )
        else:
            unverified_message = (
                "Ảnh này không khớp loại cây đã xác nhận ở Bước 1, nhưng độ tin cậy chưa đủ chắc để kết luận. "
                f"Gợi ý gần nhất: '{detected_plant}' ({detected_conf * 100:.1f}%, margin {detected_margin:.3f})."
            )

        return {
            "leaf_detected": True,
            "status": "plant_unverified",
            "message": unverified_message,
            "disease_label": f"{resolved_plant}___unknown_disease",
            "disease_confidence": 0.0,
            "inconsistent": False,
            "skipped": True,
            "plant_mismatch": False,
            "detected_plant_label": detected_plant if detected_plant != "unknown_plant" else None,
            "detected_plant_confidence": round(detected_conf, 4),
            "step2_allowed_classes": 0,
        }

    pred = predictor.predict_disease_for_plant(processed_image, resolved_plant)

    disease_label = str(pred.get("disease_label", f"{resolved_plant}___unknown_disease"))
    disease_conf = float(pred.get("disease_confidence", 0.0))
    disease_top_candidates = pred.get("disease_top_candidates", [])
    if not isinstance(disease_top_candidates, list):
        disease_top_candidates = []
    inconsistent = bool(pred.get("inconsistent", False))
    allowed_count = int(pred.get("step2_allowed_classes", 0) or 0)

    img_status = "ok"
    img_message = None
    if disease_label.endswith("unknown_disease"):
        img_status = "low_confidence_disease"
        img_message = "Độ tin cậy bệnh thấp"

    if STEP2_STRICT_PLANT_MATCH and not confident_detection:
        verify_note = (
            f"Xác minh cây chưa chắc ({detected_conf * 100:.1f}%, margin {detected_margin:.3f}) nhưng top-1 vẫn khớp."
        )
        img_message = f"{img_message} | {verify_note}" if img_message else verify_note

    return {
        "leaf_detected": True,
        "status": img_status,
        "message": img_message,
        "disease_label": disease_label,
        "disease_confidence": round(disease_conf, 4),
        "disease_top_candidates": disease_top_candidates,
        "inconsistent": inconsistent,
        "skipped": False,
        "plant_mismatch": False,
        "detected_plant_label": detected_plant if (STEP2_STRICT_PLANT_MATCH and not confident_detection) else None,
        "detected_plant_confidence": (
            round(detected_conf, 4) if (STEP2_STRICT_PLANT_MATCH and not confident_detection) else None
        ),
        "step2_allowed_classes": allowed_count,
    }


@app.post("/api/step1/plant", response_model=Step1PlantResponse, responses=error_responses)
async def step1_plant(request: Request, file: UploadFile = File(...)):
    endpoint = "/api/step1/plant"
    _enforce_rate_limit(request, endpoint)
    _enforce_request_content_length(request, UPLOAD_MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES)
    image, raw_bytes = await _decode_upload_image(file, flow="step1", endpoint=endpoint)

    # AI inference is CPU/GPU heavy; a semaphore keeps concurrent requests bounded.
    async with INFERENCE_SEMAPHORE:
        processed_image, leaf_found, leaf_stats = await asyncio.to_thread(extract_leaf_region_with_stats, image)
    if not leaf_found:
        _archive_with_metadata(
            flow="step1",
            endpoint=endpoint,
            filename=file.filename,
            raw_bytes=raw_bytes,
            prediction={
                "status": "leaf_not_found",
                "plant_label": "unknown_plant",
                "disease_label": "unknown_plant___unknown_disease",
                "leaf_detected": False,
                "model_predicted": False,
            },
        )
        raise _api_error(422, "Không phát hiện được lá cây. Hãy chụp rõ hơn.", "leaf_not_found")

    leaf_candidate_count = int(leaf_stats.get("leaf_candidate_count", 0))
    dominant_leaf_ratio = float(leaf_stats.get("largest_leaf_ratio", 0.0))
    too_many_leaves = (
        leaf_candidate_count > STEP1_MAX_LEAF_CANDIDATES
        or dominant_leaf_ratio < STEP1_MIN_DOMINANT_LEAF_RATIO
    )

    if too_many_leaves:
        response = Step1PlantResponse(
            step1_done=True,
            plant_label="unknown_plant",
            plant_confidence=0.0,
            top1_top2_margin=0.0,
            requires_confirmation=True,
            auto_confirmed=False,
            can_confirm=False,
            too_many_leaves=True,
            leaf_candidate_count=leaf_candidate_count,
            top_candidates=[],
            status="too_many_leaves",
            message=(
                "Ảnh có quá nhiều lá hoặc khung hình quá rộng. "
                "Vui lòng crop/chụp lại để chỉ còn 1 lá rõ nét trước khi chạy Bước 2."
            ),
            model_loaded=predictor.model_loaded,
            inference_mode="two_step",
        )
        _archive_with_metadata(
            flow="step1",
            endpoint=endpoint,
            filename=file.filename,
            raw_bytes=raw_bytes,
            prediction={
                "status": response.status,
                "plant_label": response.plant_label,
                "disease_label": f"{response.plant_label}___unknown_disease",
                "plant_confidence": response.plant_confidence,
                "leaf_detected": True,
                "model_predicted": False,
            },
            extra={
                "leaf_candidate_count": leaf_candidate_count,
                "largest_leaf_ratio": round(dominant_leaf_ratio, 4),
            },
        )
        return response

    async with INFERENCE_SEMAPHORE:
        pred = await asyncio.to_thread(predictor.predict_plant, processed_image)
    top_candidates = pred.get("top_candidates", [])
    requires_confirmation = bool(pred.get("requires_confirmation", True))
    auto_confirmed = bool(pred.get("auto_confirmed", False))
    can_confirm = bool(top_candidates)

    status = "ok"
    message = None

    if predictor.plant_model is None:
        status = "model_missing"
        message = "Chưa tải được model bước 1 (plant model)."
        requires_confirmation = True
        auto_confirmed = False
        can_confirm = False
    elif pred["plant_label"] == "unknown_plant":
        status = "low_confidence_plant"
        message = "Độ tin cậy loại cây thấp. Hãy chọn loại cây trong gợi ý hoặc chụp ảnh rõ hơn."
    elif requires_confirmation:
        status = "needs_confirmation"
        message = "Độ tin cậy chưa đủ chắc chắn. Hãy xác nhận loại cây trước khi chạy Bước 2."

    allowed_plants: list[str] = []
    if auto_confirmed and pred.get("plant_label") and pred.get("plant_label") != "unknown_plant":
        allowed_plants = [str(pred.get("plant_label"))]
    elif can_confirm and top_candidates:
        allowed_plants = [str(item.get("label")) for item in top_candidates if item.get("label")]

    step2_access_token, step2_access_expires_in_sec = _issue_step2_access_token(
        request=request,
        allowed_plants=allowed_plants,
    )

    response = Step1PlantResponse(
        step1_done=pred.get("step1_done", False),
        plant_label=pred.get("plant_label", "unknown_plant"),
        plant_confidence=pred.get("plant_confidence", 0.0),
        top1_top2_margin=pred.get("top1_top2_margin", 0.0),
        requires_confirmation=requires_confirmation,
        auto_confirmed=auto_confirmed,
        can_confirm=can_confirm,
        too_many_leaves=False,
        leaf_candidate_count=leaf_candidate_count,
        top_candidates=top_candidates,
        step2_access_token=step2_access_token,
        step2_access_expires_in_sec=step2_access_expires_in_sec,
        status=status,
        message=message,
        model_loaded=pred.get("model_loaded", False),
        inference_mode=pred.get("inference_mode", "two_step"),
    )
    _archive_with_metadata(
        flow="step1",
        endpoint=endpoint,
        filename=file.filename,
        raw_bytes=raw_bytes,
        prediction={
            "status": response.status,
            "plant_label": response.plant_label,
            "disease_label": f"{response.plant_label}___unknown_disease",
            "plant_confidence": response.plant_confidence,
            "requires_confirmation": response.requires_confirmation,
            "auto_confirmed": response.auto_confirmed,
            "leaf_detected": True,
            "model_predicted": True,
        },
        extra={
            "top1_top2_margin": response.top1_top2_margin,
            "leaf_candidate_count": leaf_candidate_count,
        },
    )
    return response


@app.post("/api/step2/disease", response_model=Step2DiseaseResponse, responses=error_responses)
async def step2_disease(
    request: Request,
    confirmed_plant_label: str = Form(...),
    plant_confirmed: bool = Form(False),
    step2_access_token: str | None = Form(None),
    files: list[UploadFile] = File(...),
):
    endpoint = "/api/step2/disease"
    request_id = uuid4().hex

    _enforce_rate_limit(request, endpoint)
    _enforce_request_content_length(request, STEP2_MAX_TOTAL_BYTES + MULTIPART_OVERHEAD_BYTES)

    allowed_plants_from_token: list[str] = []
    if REQUIRE_STEP2_FLOW_TOKEN:
        payload = _verify_step2_access_token(token=step2_access_token, request=request)
        allowed_plants_from_token = [str(x) for x in payload.get("allowed_plants", []) if isinstance(x, str)]

    if not plant_confirmed:
        raise _api_error(400, "Cần xác nhận loại cây ở Bước 1 trước khi chạy Bước 2.", "plant_not_confirmed")

    if not files:
        raise _api_error(400, "Bước 2 cần ít nhất 1 ảnh.", "missing_step2_files")

    if len(files) > STEP2_MAX_FILES:
        raise _api_error(400, f"Bước 2 chỉ nhận tối đa {STEP2_MAX_FILES} ảnh cho mỗi lần gửi.", "too_many_step2_files")

    resolved_plant = predictor.resolve_plant_label(confirmed_plant_label)
    if resolved_plant is None or resolved_plant == "unknown_plant":
        raise _api_error(400, "Loại cây đã xác nhận không hợp lệ. Hãy chạy Bước 1 lại.", "invalid_confirmed_plant")

    if REQUIRE_STEP2_FLOW_TOKEN and resolved_plant not in allowed_plants_from_token:
        raise _api_error(403, "Loại cây Bước 2 không khớp với kết quả Bước 1. Hãy chạy Bước 1 lại.", "step2_plant_not_allowed")

    if predictor.disease_model is None:
        raise _api_error(503, "Chưa tải được model bước 2 (disease model).", "model_unavailable")

    per_image_results: list[Step2ImageResult] = []
    score_by_label: dict[str, float] = {}
    conf_by_label: dict[str, list[float]] = {}
    candidate_conf_by_label: dict[str, list[float]] = {}

    allowed_count = 0
    successful_images = 0
    total_bytes = 0
    mismatched_plant_images = 0
    unverified_plant_images = 0
    duplicate_images = 0
    seen_hashes: set[str] = set()

    for upload in files:
        filename = upload.filename or "unknown"

        try:
            _enforce_upload_metadata(upload)
        except HTTPException as exc:
            per_image_results.append(
                Step2ImageResult(
                    image_name=filename,
                    leaf_detected=False,
                    status="invalid_file",
                    message=str(exc.detail),
                    disease_label=f"{resolved_plant}___unknown_disease",
                    disease_confidence=0.0,
                    inconsistent=False,
                    skipped=True,
                )
            )
            continue

        try:
            raw_bytes = await _read_upload_bytes_with_limit(upload)
        except HTTPException as exc:
            status = "file_too_large" if exc.status_code == 413 else "invalid_image"
            per_image_results.append(
                Step2ImageResult(
                    image_name=filename,
                    leaf_detected=False,
                    status=status,
                    message=str(exc.detail),
                    disease_label=f"{resolved_plant}___unknown_disease",
                    disease_confidence=0.0,
                    inconsistent=False,
                    skipped=True,
                )
            )
            continue

        total_bytes += len(raw_bytes)
        if total_bytes > STEP2_MAX_TOTAL_BYTES:
            _archive_with_metadata(
                flow="step2",
                endpoint=endpoint,
                filename=upload.filename,
                raw_bytes=raw_bytes,
                prediction={
                    "status": "batch_total_too_large",
                    "plant_label": resolved_plant,
                    "disease_label": f"{resolved_plant}___unknown_disease",
                    "leaf_detected": False,
                    "model_predicted": False,
                },
                extra={
                    "request_id": request_id,
                },
            )
            raise _api_error(
                413,
                (
                    f"Tổng dung lượng ảnh Bước 2 vượt giới hạn {_to_mb_text(STEP2_MAX_TOTAL_BYTES)} "
                    "cho mỗi lần gửi."
                ),
                "step2_total_too_large",
            )

        file_hash = hashlib.sha256(raw_bytes).hexdigest()
        if file_hash in seen_hashes:
            duplicate_images += 1
            per_image_results.append(
                Step2ImageResult(
                    image_name=filename,
                    leaf_detected=False,
                    status="duplicate_image",
                    message="Ảnh trùng lặp với ảnh khác trong batch (bỏ qua).",
                    disease_label=f"{resolved_plant}___unknown_disease",
                    disease_confidence=0.0,
                    inconsistent=False,
                    skipped=True,
                )
            )
            continue
        seen_hashes.add(file_hash)

        try:
            async with INFERENCE_SEMAPHORE:
                result = await asyncio.to_thread(
                    _run_step2_single_image,
                    raw_bytes=raw_bytes,
                    resolved_plant=resolved_plant,
                )
        except HTTPException as exc:
            status = "file_too_large" if exc.status_code == 413 else "invalid_image"
            _archive_with_metadata(
                flow="step2",
                endpoint=endpoint,
                filename=upload.filename,
                raw_bytes=raw_bytes,
                prediction={
                    "status": status,
                    "plant_label": resolved_plant,
                    "disease_label": f"{resolved_plant}___unknown_disease",
                    "leaf_detected": False,
                    "model_predicted": False,
                },
                extra={
                    "request_id": request_id,
                    "error": str(exc.detail),
                },
            )
            per_image_results.append(
                Step2ImageResult(
                    image_name=filename,
                    leaf_detected=False,
                    status=status,
                    message=str(exc.detail),
                    disease_label=f"{resolved_plant}___unknown_disease",
                    disease_confidence=0.0,
                    inconsistent=False,
                    skipped=True,
                )
            )
            continue

        status = str(result.get("status", "invalid_image"))
        leaf_detected = bool(result.get("leaf_detected", False))
        disease_label = str(result.get("disease_label", f"{resolved_plant}___unknown_disease"))
        disease_conf = float(result.get("disease_confidence", 0.0) or 0.0)
        disease_top_candidates = result.get("disease_top_candidates", [])
        if not isinstance(disease_top_candidates, list):
            disease_top_candidates = []
        inconsistent = bool(result.get("inconsistent", False))
        skipped = bool(result.get("skipped", False))
        plant_mismatch = bool(result.get("plant_mismatch", False))
        detected_plant_label = result.get("detected_plant_label")
        detected_plant_confidence = result.get("detected_plant_confidence")
        img_message = result.get("message")

        if status == "plant_mismatch":
            mismatched_plant_images += 1
        elif status == "plant_unverified":
            unverified_plant_images += 1

        if not skipped and leaf_detected:
            successful_images += 1
            allowed_count = int(result.get("step2_allowed_classes", allowed_count) or allowed_count)

            score_by_label[disease_label] = score_by_label.get(disease_label, 0.0) + disease_conf
            conf_by_label.setdefault(disease_label, []).append(disease_conf)
            for candidate in disease_top_candidates:
                if not isinstance(candidate, dict):
                    continue
                candidate_label = str(candidate.get("label") or "")
                candidate_conf = float(candidate.get("confidence") or 0.0)
                if candidate_label:
                    candidate_conf_by_label.setdefault(candidate_label, []).append(candidate_conf)

        archive_prediction: dict[str, Any] = {
            "status": status,
            "plant_label": resolved_plant,
            "disease_label": disease_label,
            "disease_confidence": round(disease_conf, 4),
            "inconsistent": inconsistent,
            "leaf_detected": leaf_detected,
            "model_predicted": not skipped and status in {"ok", "low_confidence_disease"},
        }
        archive_extra: dict[str, Any] = {
            "request_id": request_id,
        }
        if detected_plant_label:
            archive_extra["detected_plant_label"] = detected_plant_label
        if detected_plant_confidence is not None:
            archive_extra["detected_plant_confidence"] = detected_plant_confidence

        _archive_with_metadata(
            flow="step2",
            endpoint=endpoint,
            filename=upload.filename,
            raw_bytes=raw_bytes,
            prediction=archive_prediction,
            extra=archive_extra,
        )

        per_image_results.append(
            Step2ImageResult(
                image_name=filename,
                leaf_detected=leaf_detected,
                status=status,
                message=str(img_message) if img_message else None,
                disease_label=disease_label,
                disease_confidence=round(disease_conf, 4),
                disease_top_candidates=disease_top_candidates,
                inconsistent=inconsistent,
                skipped=skipped,
                plant_mismatch=plant_mismatch,
                detected_plant_label=str(detected_plant_label) if detected_plant_label else None,
                detected_plant_confidence=(
                    float(detected_plant_confidence) if detected_plant_confidence is not None else None
                ),
            )
        )

    failed_images = len(files) - successful_images

    if successful_images == 0:
        final_label = f"{resolved_plant}___unknown_disease"
        final_conf = 0.0
        final_disease_top_candidates: list[dict[str, Any]] = []
        message_parts: list[str] = []
        if mismatched_plant_images > 0:
            status = "plant_mismatch_detected"
            message_parts.append(
                "Ảnh Bước 2 không cùng loại cây với cây đã xác nhận ở Bước 1. "
                "Hãy gửi ảnh đúng cùng loại cây hoặc chạy lại Bước 1."
            )
        elif unverified_plant_images > 0:
            status = "plant_unverified_detected"
            message_parts.append(
                "Ảnh Bước 2 không đủ tin cậy để xác minh cùng loại cây theo Bước 1. "
                "Hãy chụp/crop lại rõ 1 lá rồi thử lại."
            )
        else:
            status = "no_valid_images"
            message_parts.append("Không có ảnh hợp lệ để chạy bước 2.")

        if duplicate_images > 0:
            message_parts.append(f"Đã bỏ qua {duplicate_images} ảnh trùng lặp trong batch.")

        message = " ".join(message_parts) if message_parts else None
    else:
        final_label = max(score_by_label.items(), key=lambda kv: kv[1])[0]
        conf_values = conf_by_label.get(final_label, [0.0])
        final_conf = float(sum(conf_values) / max(1, len(conf_values)))
        final_disease_top_candidates = [
            {
                "label": label,
                "confidence": round(sum(values) / max(1, len(values)), 4),
                "rank": rank,
            }
            for rank, (label, values) in enumerate(
                sorted(
                    candidate_conf_by_label.items(),
                    key=lambda kv: sum(kv[1]) / max(1, len(kv[1])),
                    reverse=True,
                )[:3],
                start=1,
            )
        ]

        status = "ok"
        message_parts: list[str] = []
        if final_label.endswith("unknown_disease"):
            status = "low_confidence_disease"
            message_parts.append("Độ tin cậy bệnh thấp trên tập ảnh bước 2.")
        if mismatched_plant_images > 0:
            if status == "ok":
                status = "partial_plant_mismatch"
            message_parts.append(
                f"Đã bỏ qua {mismatched_plant_images} ảnh không khớp loại cây đã xác nhận."
            )

        if unverified_plant_images > 0:
            if status == "ok":
                status = "partial_plant_unverified"
            message_parts.append(
                f"Đã bỏ qua {unverified_plant_images} ảnh không đủ tin cậy để xác minh loại cây."
            )

        if duplicate_images > 0:
            if status == "ok":
                status = "partial_duplicate_image"
            message_parts.append(f"Đã bỏ qua {duplicate_images} ảnh trùng lặp trong batch.")
        message = " ".join(message_parts) if message_parts else None

    recommendation = recommender.get(disease_label=final_label, plant_label=resolved_plant)
    recommendation_checklist = recommender.get_checklist(disease_label=final_label, plant_label=resolved_plant)

    return Step2DiseaseResponse(
        step2_done=successful_images > 0,
        plant_label=resolved_plant,
        image_count=len(files),
        successful_images=successful_images,
        failed_images=failed_images,
        mismatched_plant_images=mismatched_plant_images,
        unverified_plant_images=unverified_plant_images,
        duplicate_images=duplicate_images,
        step2_allowed_classes=allowed_count,
        final_disease_label=final_label,
        final_disease_confidence=round(final_conf, 4),
        final_disease_top_candidates=final_disease_top_candidates,
        recommendation=recommendation,
        recommendation_checklist=recommendation_checklist,
        status=status,
        message=message,
        model_loaded=predictor.model_loaded,
        inference_mode="two_step",
        per_image=per_image_results,
    )


@app.post("/api/predict", response_model=PredictResponse, responses=error_responses)
async def predict(request: Request, file: UploadFile = File(...)):
    endpoint = "/api/predict"
    if not ENABLE_LEGACY_PREDICT_ENDPOINT:
        raise _api_error(404, "Endpoint /api/predict đã bị tắt. Hãy dùng flow 2 bước.", "legacy_endpoint_disabled")

    _enforce_rate_limit(request, endpoint)
    _enforce_request_content_length(request, UPLOAD_MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES)
    image, raw_bytes = await _decode_upload_image(file, flow="predict", endpoint=endpoint)

    # Legacy AI path is kept bounded by the same semaphore as the two-step flow.
    async with INFERENCE_SEMAPHORE:
        processed_image, leaf_found = await asyncio.to_thread(extract_leaf_region, image)
    if not leaf_found:
        _archive_with_metadata(
            flow="predict",
            endpoint=endpoint,
            filename=file.filename,
            raw_bytes=raw_bytes,
            prediction={
                "status": "leaf_not_found",
                "plant_label": "unknown_plant",
                "disease_label": "unknown_plant___unknown_disease",
                "leaf_detected": False,
                "model_predicted": False,
            },
        )
        raise _api_error(422, "Không phát hiện được lá cây. Hãy chụp rõ hơn.", "leaf_not_found")

    async with INFERENCE_SEMAPHORE:
        pred = await asyncio.to_thread(predictor.predict, processed_image)

    plant_label = pred["plant_label"]
    plant_conf = pred["plant_confidence"]
    disease_label = pred["disease_label"]
    disease_conf = pred["disease_confidence"]

    recommendation = recommender.get(disease_label=disease_label, plant_label=plant_label)
    recommendation_checklist = recommender.get_checklist(disease_label=disease_label, plant_label=plant_label)

    status = "ok"
    message = None

    if not pred["model_loaded"]:
        status = "model_missing"
        message = "Model chưa được tải đầy đủ."
    elif plant_label == "unknown_plant":
        status = "low_confidence_plant"
        message = "Độ tin cậy loại cây thấp. Vui lòng chụp ảnh rõ hơn."
    elif disease_label.endswith("unknown_disease"):
        status = "low_confidence_disease"
        message = "Độ tin cậy bệnh thấp. Vui lòng chụp lại trong điều kiện ánh sáng tốt."
    elif pred["inconsistent"]:
        status = "inconsistent_fixed"
        message = "Đã phát hiện mâu thuẫn nhãn và đã sửa theo nhóm bệnh của cây."

    response = PredictResponse(
        plant_label=plant_label,
        plant_confidence=plant_conf,
        disease_label=disease_label,
        disease_confidence=disease_conf,
        disease_top_candidates=pred.get("disease_top_candidates", []),
        step1_done=pred.get("step1_done", True),
        step2_done=pred.get("step2_done", True),
        step2_allowed_classes=pred.get("step2_allowed_classes", 0),
        inference_mode=pred.get("inference_mode", "two_step"),
        recommendation=recommendation,
        recommendation_checklist=recommendation_checklist,
        status=status,
        message=message,
        inconsistent=pred["inconsistent"],
        model_loaded=pred["model_loaded"],
    )
    _archive_with_metadata(
        flow="predict",
        endpoint=endpoint,
        filename=file.filename,
        raw_bytes=raw_bytes,
        prediction={
            "status": response.status,
            "plant_label": response.plant_label,
            "disease_label": response.disease_label,
            "plant_confidence": response.plant_confidence,
            "disease_confidence": response.disease_confidence,
            "inconsistent": response.inconsistent,
            "leaf_detected": True,
            "model_predicted": True,
        },
    )
    return response
