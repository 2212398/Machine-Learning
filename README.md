# Plant Leaf Detection + Disease Diagnosis (Local)

This project is a local web app for plant leaf analysis with a two-stage logic:

1. Detect plant type first.
2. Detect disease only inside that plant's valid disease set.

## Confirmed Requirements

- Core AI: Python + PyTorch
- Training: 2 models (MobileNetV3)
  - Plant type classifier
  - Disease classifier
- Deployment: 2 models (MobileNetV3)
  - Plant inference model
  - Disease inference model
- Image processing: OpenCV (read, resize, threshold + contour leaf extraction)
- Backend: FastAPI
- Frontend: HTML + CSS + JavaScript (Vietnamese UI)
- Runtime: local only, supports CPU and GPU

## Folder Structure

```text
code/
  backend/
    app/
      labels/
      models/
      main.py
      inference.py
      preprocess.py
      recommendations.py
      schemas.py
      config.py
    requirements.txt
  frontend/
    index.html
    styles.css
    app.js
  training/
    train_plant_mobilenetv3.py
    train_disease_mobilenetv3.py
```

## Quick Start

1. Create and activate virtual environment.
2. Install dependencies:

```powershell
pip install -r backend/requirements.txt
```

3. Put your deployed model files at:

```text
backend/app/models/plant_mobilenetv3.pt
backend/app/models/disease_mobilenetv3.pt
```

4. Run API + frontend server:

```powershell
py -m uvicorn backend.app.main:app --app-dir code --host 127.0.0.1 --port 8000
```

5. Open:

```text
http://127.0.0.1:8000
```

## Upload Limits + Datalake Archive

The API applies upload safety limits and stores user uploads in a datalake-style archive for later dataset improvement.

Default limits:

- Max image size: 8 MB per image
- Step 2 max files: 6 images per request
- Step 2 max total size: 24 MB per request

Default archive folder:

- `backend/app/upload_archive`

Datalake behavior:

- Raw image is stored for each accepted upload.
- A sidecar JSON metadata file is stored with timestamp, endpoint, and prediction.
- Images are grouped into scope buckets for retraining workflows:
  - `in_scope`
  - `out_of_scope`
  - `other`
- A daily JSONL manifest is appended for batch pipelines.

Environment variables:

- `UPLOAD_ARCHIVE_ENABLED` (`1` or `0`)
- `UPLOAD_ARCHIVE_DIR`
- `UPLOAD_MAX_IMAGE_BYTES`
- `STEP2_MAX_FILES`
- `STEP2_MAX_TOTAL_BYTES`

## Dataset Notes

Expected labels are hierarchical:

- Level 1: plant type (tomato, potato, pepper, ...)
- Level 2: plant-specific disease labels (example: tomato___late_blight)

Edit label files in `backend/app/labels` to match your dataset.
