# Nộp Supabase SQL (Schema + Data mẫu)

Thư mục này phục vụ việc **nộp scripts SQL Supabase** cho dự án.

## 1) Scripts tạo bảng / policy (schema)

- Nguồn gốc: các migration gốc nằm ở `code/supabase/migrations/`.
- File gộp để nộp nhanh: `code/supabase/submission/schema.sql`.

**Thứ tự chạy (đúng theo migration):**
1. `001_phase1_init.sql` – tạo các bảng chính (`profiles`, `diagnoses`, `diagnosis_images`, `feedbacks`), trigger `updated_at`, auth hook tạo `profiles`, bật RLS + policies.
2. `002_scan_history_rls.sql` – tạo bảng `scan_history` + RLS.
3. `003_add_diagnosis_note.sql` – thêm cột `note` cho `diagnoses`.
4. `004_harden_auth_storage.sql` – tạo/siết bucket `leaf-uploads` + policies Storage (RLS).
5. `005_move_auth_hook_private.sql` – chuyển auth hook sang schema `private`.
6. `006_lock_profile_role.sql` – khoá việc tự đổi `profiles.role` và siết policy insert.

## 2) Data mẫu (seed)

- File: `code/supabase/submission/sample_data.sql`
- Cách chạy: vào **Supabase Dashboard → SQL Editor** và chạy sau khi đã chạy schema.

**Điều kiện:** cần có **ít nhất 1 user** trong `Authentication → Users`.
- Nếu chưa có user, tạo 1 tài khoản (email/password) trước.

## 3) Cách nộp (khuyến nghị)

- Nộp 2 file:
  - `schema.sql`
  - `sample_data.sql`

Hoặc nộp nguyên thư mục migration gốc `code/supabase/migrations/` (nếu giảng viên yêu cầu đúng format migration).
