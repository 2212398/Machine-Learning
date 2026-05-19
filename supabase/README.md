# Supabase Setup - Phase 1

Tài liệu này chứa migration SQL và quy ước thiết lập Supabase cho dự án.

## Cần làm

1. Tạo một project Supabase mới.
2. Copy nội dung file migration vào SQL Editor hoặc Supabase CLI migration.
3. Bật Authentication cho email/password.
4. Tạo bucket `leaf-uploads` ở chế độ private.
5. Kiểm tra RLS cho từng bảng và policy Storage.

## Quy ước path upload

- `user-id/yyyy/mm/dd/uuid-filename`

Path này giúp policy Storage xác định owner và giúp truy vết dữ liệu dễ hơn khi audit hoặc gỡ lỗi.