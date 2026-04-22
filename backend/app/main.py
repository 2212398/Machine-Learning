import json
import logging
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import (
    DEVICE,
    DISEASE_BACKBONE,
    DISEASE_MAP_PATH,
    DISEASE_MODEL_PATH,
    DISEASE_LABELS_PATH,
    DISEASE_THRESHOLD,
    FRONTEND_DIR,
    INDEX_FILE,
    PLANT_BACKBONE,
    PLANT_GATE_CONFIDENCE,
    PLANT_GATE_MARGIN,
    PLANT_MODEL_PATH,
    PLANT_LABELS_PATH,
    PLANT_THRESHOLD,
    RECOMMENDATION_PATH,
    STEP2_MAX_FILES,
    STEP2_MAX_TOTAL_BYTES,
    STEP1_MAX_LEAF_CANDIDATES,
    STEP1_MIN_DOMINANT_LEAF_RATIO,
    UPLOAD_ARCHIVE_DIR,
    UPLOAD_ARCHIVE_ENABLED,
    UPLOAD_MAX_IMAGE_BYTES,
)
from .inference import PlantDiseasePredictor
from .preprocess import extract_leaf_region, extract_leaf_region_with_stats
from .recommendations import RecommendationEngine
from .schemas import (
    PredictResponse,
    Step1PlantResponse,
    Step2DiseaseResponse,
    Step2ImageResult,
)


LOGGER = logging.getLogger(__name__)


app = FastAPI(title="Plant Leaf Detection API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_loaded": predictor.model_loaded,
        "plant_model_loaded": predictor.plant_model is not None,
        "disease_model_loaded": predictor.disease_model is not None,
        "device": predictor.device,
        "upload_archive_enabled": UPLOAD_ARCHIVE_ENABLED,
        "upload_archive_dir": str(UPLOAD_ARCHIVE_DIR),
        "upload_max_image_mb": round(UPLOAD_MAX_IMAGE_BYTES / (1024 * 1024), 2),
        "step2_max_files": STEP2_MAX_FILES,
        "step2_max_total_mb": round(STEP2_MAX_TOTAL_BYTES / (1024 * 1024), 2),
    }


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
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break

        total_bytes += len(chunk)
        if total_bytes > UPLOAD_MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Kich thuoc anh vuot gioi han {_to_mb_text(UPLOAD_MAX_IMAGE_BYTES)}.",
            )

        chunks.append(chunk)

    if total_bytes <= 0:
        raise HTTPException(status_code=400, detail="File anh rong.")

    return b"".join(chunks)


def _decode_image_bytes(raw_bytes: bytes) -> np.ndarray:
    np_img = np.frombuffer(raw_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Khong doc duoc anh. Vui long thu lai.")

    return image


async def _decode_upload_image(file: UploadFile, flow: str, endpoint: str) -> tuple[np.ndarray, bytes]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Chi chap nhan file anh (JPG/PNG)")

    raw_bytes = await _read_upload_bytes_with_limit(file)
    try:
        image = _decode_image_bytes(raw_bytes)
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


@app.post("/api/step1/plant", response_model=Step1PlantResponse)
async def step1_plant(file: UploadFile = File(...)):
    endpoint = "/api/step1/plant"
    image, raw_bytes = await _decode_upload_image(file, flow="step1", endpoint=endpoint)
    processed_image, leaf_found, leaf_stats = extract_leaf_region_with_stats(image)
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
        raise HTTPException(status_code=422, detail="Khong phat hien duoc la cay. Hay chup ro hon.")

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
                "Anh co qua nhieu la hoac khung hinh qua rong. "
                "Vui long crop/chup lai de chi con 1 la ro net truoc khi chay Buoc 2."
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

    pred = predictor.predict_plant(processed_image)
    top_candidates = pred.get("top_candidates", [])
    requires_confirmation = bool(pred.get("requires_confirmation", True))
    auto_confirmed = bool(pred.get("auto_confirmed", False))
    can_confirm = bool(top_candidates)

    status = "ok"
    message = None

    if predictor.plant_model is None:
        status = "model_missing"
        message = "Chua tai duoc model buoc 1 (plant model)."
        requires_confirmation = True
        auto_confirmed = False
        can_confirm = False
    elif pred["plant_label"] == "unknown_plant":
        status = "low_confidence_plant"
        message = "Do tin cay loai cay thap. Hay chon loai cay trong goi y hoac chup anh ro hon."
    elif requires_confirmation:
        status = "needs_confirmation"
        message = "Do tin cay chua du chac chan. Hay xac nhan loai cay truoc khi chay Buoc 2."

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


@app.post("/api/step2/disease", response_model=Step2DiseaseResponse)
async def step2_disease(
    confirmed_plant_label: str = Form(...),
    plant_confirmed: bool = Form(False),
    files: list[UploadFile] = File(...),
):
    endpoint = "/api/step2/disease"
    request_id = uuid4().hex

    if not plant_confirmed:
        raise HTTPException(status_code=400, detail="Can xac nhan loai cay o Buoc 1 truoc khi chay Buoc 2.")

    if not files:
        raise HTTPException(status_code=400, detail="Buoc 2 can it nhat 1 anh.")

    if len(files) > STEP2_MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Buoc 2 chi nhan toi da {STEP2_MAX_FILES} anh cho moi lan gui.",
        )

    resolved_plant = predictor.resolve_plant_label(confirmed_plant_label)
    if resolved_plant is None or resolved_plant == "unknown_plant":
        raise HTTPException(status_code=400, detail="Loai cay da xac nhan khong hop le. Hay chay Buoc 1 lai.")

    if predictor.disease_model is None:
        raise HTTPException(status_code=500, detail="Chua tai duoc model buoc 2 (disease model).")

    per_image_results: list[Step2ImageResult] = []
    score_by_label: dict[str, float] = {}
    conf_by_label: dict[str, list[float]] = {}

    allowed_count = 0
    successful_images = 0
    total_bytes = 0

    for upload in files:
        filename = upload.filename or "unknown"

        if not upload.content_type or not upload.content_type.startswith("image/"):
            per_image_results.append(
                Step2ImageResult(
                    image_name=filename,
                    leaf_detected=False,
                    status="invalid_file",
                    message="File khong phai anh JPG/PNG",
                    disease_label=f"{resolved_plant}___unknown_disease",
                    disease_confidence=0.0,
                    inconsistent=False,
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
            raise HTTPException(
                status_code=413,
                detail=(
                    f"Tong dung luong anh Buoc 2 vuot gioi han {_to_mb_text(STEP2_MAX_TOTAL_BYTES)} "
                    "cho moi lan gui."
                ),
            )

        try:
            image = _decode_image_bytes(raw_bytes)
        except HTTPException as exc:
            _archive_with_metadata(
                flow="step2",
                endpoint=endpoint,
                filename=upload.filename,
                raw_bytes=raw_bytes,
                prediction={
                    "status": "invalid_image",
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
                    status="invalid_image",
                    message=str(exc.detail),
                    disease_label=f"{resolved_plant}___unknown_disease",
                    disease_confidence=0.0,
                    inconsistent=False,
                )
            )
            continue

        processed_image, leaf_found = extract_leaf_region(image)
        if not leaf_found:
            _archive_with_metadata(
                flow="step2",
                endpoint=endpoint,
                filename=upload.filename,
                raw_bytes=raw_bytes,
                prediction={
                    "status": "leaf_not_found",
                    "plant_label": resolved_plant,
                    "disease_label": f"{resolved_plant}___unknown_disease",
                    "leaf_detected": False,
                    "model_predicted": False,
                },
                extra={
                    "request_id": request_id,
                },
            )
            per_image_results.append(
                Step2ImageResult(
                    image_name=filename,
                    leaf_detected=False,
                    status="leaf_not_found",
                    message="Khong phat hien duoc la cay",
                    disease_label=f"{resolved_plant}___unknown_disease",
                    disease_confidence=0.0,
                    inconsistent=False,
                )
            )
            continue

        pred = predictor.predict_disease_for_plant(processed_image, resolved_plant)
        successful_images += 1
        allowed_count = pred.get("step2_allowed_classes", allowed_count)

        disease_label = pred.get("disease_label", f"{resolved_plant}___unknown_disease")
        disease_conf = float(pred.get("disease_confidence", 0.0))

        score_by_label[disease_label] = score_by_label.get(disease_label, 0.0) + disease_conf
        conf_by_label.setdefault(disease_label, []).append(disease_conf)

        img_status = "ok"
        img_message = None
        if disease_label.endswith("unknown_disease"):
            img_status = "low_confidence_disease"
            img_message = "Do tin cay benh thap"

        _archive_with_metadata(
            flow="step2",
            endpoint=endpoint,
            filename=upload.filename,
            raw_bytes=raw_bytes,
            prediction={
                "status": img_status,
                "plant_label": resolved_plant,
                "disease_label": disease_label,
                "disease_confidence": round(disease_conf, 4),
                "inconsistent": bool(pred.get("inconsistent", False)),
                "leaf_detected": True,
                "model_predicted": True,
            },
            extra={
                "request_id": request_id,
            },
        )

        per_image_results.append(
            Step2ImageResult(
                image_name=filename,
                leaf_detected=True,
                status=img_status,
                message=img_message,
                disease_label=disease_label,
                disease_confidence=round(disease_conf, 4),
                inconsistent=pred.get("inconsistent", False),
            )
        )

    failed_images = len(files) - successful_images

    if successful_images == 0:
        final_label = f"{resolved_plant}___unknown_disease"
        final_conf = 0.0
        status = "no_valid_images"
        message = "Khong co anh hop le de chay buoc 2."
    else:
        final_label = max(score_by_label.items(), key=lambda kv: kv[1])[0]
        conf_values = conf_by_label.get(final_label, [0.0])
        final_conf = float(sum(conf_values) / max(1, len(conf_values)))

        status = "ok"
        message = None
        if final_label.endswith("unknown_disease"):
            status = "low_confidence_disease"
            message = "Do tin cay benh thap tren tap anh buoc 2."

    recommendation = recommender.get(disease_label=final_label, plant_label=resolved_plant)

    return Step2DiseaseResponse(
        step2_done=successful_images > 0,
        plant_label=resolved_plant,
        image_count=len(files),
        successful_images=successful_images,
        failed_images=failed_images,
        step2_allowed_classes=allowed_count,
        final_disease_label=final_label,
        final_disease_confidence=round(final_conf, 4),
        recommendation=recommendation,
        status=status,
        message=message,
        model_loaded=predictor.model_loaded,
        inference_mode="two_step",
        per_image=per_image_results,
    )


@app.post("/api/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    endpoint = "/api/predict"
    image, raw_bytes = await _decode_upload_image(file, flow="predict", endpoint=endpoint)
    processed_image, leaf_found = extract_leaf_region(image)
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
        raise HTTPException(status_code=422, detail="Khong phat hien duoc la cay. Hay chup ro hon.")

    pred = predictor.predict(processed_image)

    plant_label = pred["plant_label"]
    plant_conf = pred["plant_confidence"]
    disease_label = pred["disease_label"]
    disease_conf = pred["disease_confidence"]

    recommendation = recommender.get(disease_label=disease_label, plant_label=plant_label)

    status = "ok"
    message = None

    if not pred["model_loaded"]:
        status = "model_missing"
        message = "Model chua duoc tai day du."
    elif plant_label == "unknown_plant":
        status = "low_confidence_plant"
        message = "Do tin cay loai cay thap. Vui long chup anh ro hon."
    elif disease_label.endswith("unknown_disease"):
        status = "low_confidence_disease"
        message = "Do tin cay benh thap. Vui long chup lai trong dieu kien anh sang tot."
    elif pred["inconsistent"]:
        status = "inconsistent_fixed"
        message = "Da phat hien mau thuan nhan va da sua theo nhom benh cua cay."

    response = PredictResponse(
        plant_label=plant_label,
        plant_confidence=plant_conf,
        disease_label=disease_label,
        disease_confidence=disease_conf,
        step1_done=pred.get("step1_done", True),
        step2_done=pred.get("step2_done", True),
        step2_allowed_classes=pred.get("step2_allowed_classes", 0),
        inference_mode=pred.get("inference_mode", "two_step"),
        recommendation=recommendation,
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
