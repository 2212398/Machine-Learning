# Plant Leaf Detection + Disease Diagnosis (Local)

This project is a local web app for plant leaf analysis with a two-stage logic:

1. Detect plant type first.
2. Detect disease only inside that plant's valid disease set.

## Confirmed Requirements

- Core AI: Python + PyTorch
- Training: 2 models (EfficientNet-B4)
  - Plant type classifier
  - Disease classifier
- Deployment: 2 models (EfficientNet-B4)
  - Plant inference model
  - Disease inference model
- Image processing: OpenCV (read, resize, threshold + contour leaf extraction)
- Backend: FastAPI
- Frontend migration target: Next.js App Router + Tailwind CSS
- Backend/BaaS target: Supabase Auth, Database, Storage and RLS
- Runtime: local now, VPS deployment later with Docker and SSL

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
    legacy static frontend kept for reference during migration
  frontend-next/
    app/
    components/
    features/
    lib/
    types/
  supabase/
    migrations/
  training/
    train_plant_efficientnet_b4.py
    train_disease_efficientnet_b4.py
```

## Quick Start

1. Create and activate virtual environment.
2. Install dependencies:

```powershell
pip install -r backend/requirements.txt
```

3. Put your deployed model files at:

```text
backend/app/models/plant_efficientnet_b4.pt
backend/app/models/disease_efficientnet_b4.pt
```

4. Apply the Supabase migration in `code/supabase/migrations/001_phase1_init.sql`.

5. Copy `code/frontend-next/.env.example` to `.env.local` and fill Supabase values.

6. Install frontend dependencies and run the Next.js app:

```powershell
cd code/frontend-next
npm install
npm run dev
```

7. Run API + frontend server for the legacy stack if you still need the old static UI:

```powershell
py -m uvicorn backend.app.main:app --app-dir code --host 127.0.0.1 --port 8000
```

8. Open:

```text
http://127.0.0.1:8000
```

## Docker Deployment

The repository now includes a minimal Docker setup for the production-shaped Phase 3 deployment:

- `Dockerfile.backend` for the FastAPI AI service
- `Dockerfile.frontend` for the Next.js frontend
- `docker-compose.yml` to run both services together
- `nginx/default.conf` for reverse proxy and TLS termination

Example:

```powershell
docker compose up --build
```

Required environment variables for the frontend/backend compose run:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_FASTAPI_URL`
- `DOMAIN` or a direct HTTPS `NEXT_PUBLIC_FASTAPI_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FEEDBACK_AGGREGATOR_ENABLED=1` only when scheduled retraining CSV exports are intended.

Nginx serves the app on ports 80/443, redirects HTTP to HTTPS, proxies `/api/` to the FastAPI backend, and proxies everything else to Next.js. Replace the placeholder certificate path in `nginx/default.conf` with your real domain before production use.

The backend mounts the model, labels, optional upload archive, and retraining export folders so the container can reuse local assets without rebuilding the image every time.

## Upload Limits + Datalake Archive

The API applies upload safety limits. Raw upload archiving is opt-in for retraining workflows.

Default limits:

- Max image size: 5 MB per image
- Step 2 max files: 6 images per request
- Step 2 max total size: 24 MB per request

Default archive folder when `UPLOAD_ARCHIVE_ENABLED=1`:

- `backend/app/upload_archive`

Datalake behavior:

- Raw image is stored for each accepted upload only when archiving is enabled.
- A sidecar JSON metadata file is stored with timestamp, endpoint, and prediction.
- Images are grouped into scope buckets for retraining workflows:
  - `in_scope`
  - `out_of_scope`
  - `other`
- A daily JSONL manifest is appended for batch pipelines.

Environment variables:

- `UPLOAD_ARCHIVE_ENABLED` (`1` or `0`)
- `FEEDBACK_AGGREGATOR_ENABLED` (`1` or `0`)
- `ENABLE_API_DOCS` (`1` for local API docs, `0` in production)
- `UPLOAD_ARCHIVE_DIR`
- `UPLOAD_MAX_IMAGE_BYTES`
- `STEP2_MAX_FILES`
- `STEP2_MAX_TOTAL_BYTES`

## Dataset Notes

Expected labels are hierarchical:

- Level 1: plant type (tomato, potato, pepper, ...)
- Level 2: plant-specific disease labels (example: tomato___late_blight)

Edit label files in `backend/app/labels` to match your dataset.
