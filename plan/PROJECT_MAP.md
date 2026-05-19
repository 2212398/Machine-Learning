**PROJECT MAP**

Mục đích: Tài liệu này cung cấp bản đồ kiến trúc và mapping giữa tính năng → file để hỗ trợ việc sửa lỗi có hệ thống.

**1) Tổng quan Kiến trúc (Architecture Overview)**

- Frontend: `code/frontend-next` — Next.js (App Router). UI tách rõ Server Components và Client Components. Frontend thực hiện:
  - Upload ảnh (Supabase Storage) —> gọi backend FastAPI để inference (POST /api/step1)
  - Quản lý session/auth via Supabase Auth (supabase-js SSR helpers)
  - Lưu kết quả (tạo bản ghi `diagnoses`, `diagnosis_images`) vào Supabase

- Backend / AI microservice: `code/backend/app` — FastAPI ứng dụng. Nhiệm vụ chính:
  - Nhận ảnh, tiền xử lý, phân vùng lá (preprocess.py)
  - Chạy mô hình PyTorch / TorchScript (inference.py: `PlantDiseasePredictor`)
  - Trả về JSON inference tới frontend (main.py endpoints như `/api/step1`, `/api/health`, `/api/recommendation`)
  - Background tasks: feedback aggregation, export retraining data

- Database / BaaS: Supabase (Postgres + Auth + Storage)
  - Bảng chính: `diagnoses`, `diagnosis_images`, `feedbacks`, `profiles` (xem `code/frontend-next/types/database.ts`)
  - Bucket storage: `leaf-uploads` (dùng để lưu ảnh upload)

- Infra / Deployment
  - Docker compose definitions in `code/docker-compose.yml` (backend, frontend, nginx, certbot services)
  - Nginx config: `code/nginx/default.conf`
  - Certbot helper: `code/nginx/certbot`


**2) Feature-to-File Mapping**

Feature: Upload Ảnh & Nhận diện Bệnh
- Frontend (UI & Trạng thái):
  - `code/frontend-next/app/(dashboard)/...` pages where upload exists (entrypoints) — primary action implemented in `code/frontend-next/lib/actions/diagnosis.ts` (Server Action)
  - `code/frontend-next/components/*` — UI components (upload buttons, previews). Main home `code/frontend-next/app/page.tsx` includes demo usage.
- Frontend (Logic & API call):
  - `code/frontend-next/lib/actions/diagnosis.ts` — orchestrates: upload to Supabase Storage, call FastAPI (`FASTAPI_URL` /api/step1), insert `diagnoses` and `diagnosis_images` rows
  - `code/frontend-next/utils/supabase/client.ts` — browser-side supabase client helper
  - `code/frontend-next/utils/supabase/server.ts` and `code/frontend-next/lib/supabase/server.ts` — server helpers to create supabase server client (cookies aware)
- Backend / Microservice:
  - `code/backend/app/main.py` — FastAPI endpoints, wiring to predictor and preprocess
  - `code/backend/app/inference.py` — `PlantDiseasePredictor` loads TorchScript/checkpoint and runs inference
  - `code/backend/app/preprocess.py` — image cropping/extraction helpers
  - `code/backend/app/recommendations.py` — builds human readable recommendations
- Database / Storage:
  - Supabase tables: `diagnoses`, `diagnosis_images` (see `code/frontend-next/types/database.ts`)
  - Storage bucket: `leaf-uploads`
- Dependencies:
  - `lib/actions/diagnosis.ts` imports `createSupabaseServerClient` and uses `fetch` to call FastAPI; it depends on Supabase API types (types/database.ts) and storage bucket naming


Feature: Authentication (Sign-in / Sign-up)
- Frontend (UI):
  - `code/frontend-next/app/sign-in/*`, `code/frontend-next/app/sign-up/*`, components under `code/frontend-next/components/auth` (sign-in/sign-up UI)
- Frontend (Logic):
  - Supabase client/browser helper `code/frontend-next/utils/supabase/client.ts` and server helper `code/frontend-next/utils/supabase/server.ts` (and `lib/supabase/server.ts`) handle cookie/session in server components
- Backend: None (Supabase handles Auth)
- DB/Storage: `profiles` table in Supabase stores user metadata
- Dependencies: UI pages call supabase auth client methods; RLS policies in Supabase rely on `user.id`


Feature: Dashboard / History (Lịch sử chẩn đoán)
- Frontend (UI): `code/frontend-next/app/dashboard/*` and `code/frontend-next/app/dashboard/history/page.tsx`
- Logic: server components use `createSupabaseServerClient()` to query `diagnoses` and `diagnosis_images`
- Backend: none (reads go direct to Supabase)
- DB: `diagnoses`, `diagnosis_images`


Feature: Feedback / Retraining Export
- Frontend: `code/frontend-next/lib/actions/feedback.ts` (server action records feedbacks)
- Backend: background aggregator in `code/backend/app/main.py::_start_feedback_aggregator` reads `feedbacks` from Supabase and writes CSV into `training/retraining_exports`
- DB: `feedbacks` table


Feature: Model loading & inference
- Backend: `code/backend/app/inference.py` loads models from `code/backend/app/models/` or paths defined in config
- Related files: `code/backend/app/config.py` defines model paths and thresholds (read at startup), `code/backend/app/main.py` creates `PlantDiseasePredictor` instance


Feature: Static Frontend Serving
- Backend: `main.py` mounts `FRONTEND_DIR` as static files via StaticFiles; used in Docker deploy to serve built Next static assets


3) Phân tích điểm nghẽn & Rủi ro (Impact Analysis)

Core files (high impact if changed):
- `code/frontend-next/lib/supabase/server.ts` và `code/frontend-next/utils/supabase/*` — central to all server-side Supabase access. Any change affects auth, queries, cookie handling across pages and server actions.
- `code/frontend-next/lib/actions/diagnosis.ts` — orchestrates upload/inference/db writes; high-risk when changing: affects upload flow, DB schema assumptions, and subsequent UI.
- `code/frontend-next/types/database.ts` — canonical DB types used for typed supabase calls. Changing this affects TypeScript checks and supabase typed inserts/selects across code.
- `code/backend/app/inference.py` — model load & inference logic. Changing affects prediction outputs, thresholds, and may break frontend expectations.
- `code/backend/app/main.py` — endpoint wiring, rate-limiting, step2 token flow, feedback aggregator. Big impact on endpoint behavior.
- `code/docker-compose.yml`, `code/nginx/default.conf` — deployment/serving; changes affect prod behavior and TLS.

Risk notes:
- Changing supabase server helpers without preserving cookie API can break server-side auth (createServerClient reading cookies)
- Modifying DB schema (e.g., column names) requires migration and updating `types/database.ts` and all insert/select usages
- Model file corruption or wrong path breaks `torch.jit.load` in `inference.py` — fastapi starts but inference returns errors
- Global string substitutions (e.g., sed) can break TypeScript code (example: previously `(diagnosis as any).id` substitutions created syntax errors) — avoid wide regex replacements


4) Quy trình Fix Bug an toàn (Checklist)

Trước khi thay đổi logic bất kỳ file nào, tuân thủ checklist sau:

1. Tạo nhánh git riêng (feature/bugfix) và đảm bảo workspace sạch:
   - git checkout -b fix/...; git status

2. Chạy kiểm tra tĩnh & sao lưu:
   - `cd code/frontend-next` → `npx tsc --noEmit` (sửa tsconfig nếu lỗi môi trường)
   - `npm run build` để bắt lỗi compile sớm
   - Sao lưu file model / DB schema nếu thay đổi: copy model, export table schema

3. Chạy thay đổi cục bộ và viết unit/smoke test:
   - Thực hiện thay đổi nhỏ, chạy `npm run build` và `pytest` hoặc smoke test cho backend (`python -m code.backend.app.main` or `uvicorn code.backend.app.main:app --reload`) và thực hiện request `/api/health`.
   - Kiểm tra upload flow: upload sample image, verify record in Supabase (or local test DB)

4. Chế độ an toàn khi deploy:
   - Nếu thay đổi liên quan tới DB schema, write migration script and run on staging first
   - Nếu thay đổi core (supabase helpers, inference), deploy to staging/VPS with maintenance page behind nginx and monitor logs


Appendix: Quick file index (paths referenced)
- Frontend main: `code/frontend-next/app/*`, `code/frontend-next/lib/*`, `code/frontend-next/utils/*`, `code/frontend-next/components/*`, `code/frontend-next/types/*`
- Backend main: `code/backend/app/main.py`, `code/backend/app/inference.py`, `code/backend/app/preprocess.py`, `code/backend/app/recommendations.py`, `code/backend/app/schemas.py`, `code/backend/app/config.py`
- Deployment: `code/docker-compose.yml`, `code/nginx/default.conf`, `code/Dockerfile.backend`, `code/Dockerfile.frontend`
- Training & utilities: `training/`, `tools/gather_evidence.ps1`

---
Tài liệu này là điểm khởi đầu để rà soát các thay đổi. Nếu bạn muốn, tôi có thể tiếp tục và tự động sinh một sơ đồ dependency call-graph nhỏ cho 1 tính năng (ví dụ Upload→Diagnosis) bằng cách parse `lib/actions/diagnosis.ts` và `backend/app/main.py` để liệt kê các hàm và điểm gọi cụ thể.
