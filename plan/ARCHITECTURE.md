# ARCHITECTURE - Hệ thống Nhận diện Bệnh trên Lá Cây

Tài liệu này là ngữ cảnh chuẩn cho mọi chức năng mới của dự án. Khi code hoặc refactor, hãy ưu tiên tuân thủ tài liệu này để tránh lệch kiến trúc, giảm code rác và giữ tính nhất quán giữa Frontend, Supabase và AI Service.

## 1. Mục tiêu kiến trúc

Hệ thống được thiết kế theo mô hình 3 lớp:

- **Frontend**: Next.js App Router + Tailwind CSS.
- **Backend/BaaS**: Supabase cho Authentication, Database, Storage và RLS.
- **AI Microservice**: FastAPI + PyTorch + MobileNetV3 + OpenCV.

Nguyên tắc cốt lõi:

- Frontend không chứa logic ML.
- Supabase giữ dữ liệu người dùng, lịch sử chẩn đoán và file ảnh.
- FastAPI chỉ làm suy luận, tiền xử lý ảnh và chuẩn hóa kết quả AI.
- Mọi thao tác nhạy cảm phải diễn ra ở server-side hoặc qua quyền Supabase hợp lệ.

## 2. Cách các thành phần giao tiếp với nhau

### 2.1 Frontend -> Supabase

Next.js giao tiếp với Supabase để:

- Đăng ký, đăng nhập, đăng xuất.
- Lấy session người dùng.
- CRUD dữ liệu lịch sử chẩn đoán.
- Upload và quản lý ảnh trong Supabase Storage.

Quy tắc:

- Client Component chỉ được dùng `anon key` thông qua Supabase client công khai khi thật sự cần.
- Các thao tác ghi dữ liệu nhạy cảm hoặc tạo signed URL nên đi qua Server Action, Route Handler hoặc server-side utility.
- RLS luôn phải được bật cho bảng dữ liệu user-facing.

### 2.2 Frontend -> FastAPI

Next.js không được gọi thẳng FastAPI từ Client Component trong các tính năng chính.

Chuẩn giao tiếp đúng:

1. User thao tác trên UI.
2. Frontend upload ảnh lên Supabase Storage.
3. Frontend hoặc Server Action tạo request hợp lệ.
4. Next.js gọi FastAPI qua Server Action, Route Handler, hoặc server-side fetch.
5. FastAPI trả JSON chuẩn.
6. Next.js cập nhật UI và lưu kết quả vào Supabase nếu cần.

Lý do:

- Tránh lộ API URL và token nội bộ.
- Dễ kiểm soát auth, log và retry.
- Dễ thay đổi contract mà không phá UI.

### 2.3 FastAPI -> Supabase

FastAPI không phải nơi chính để thao tác CRUD nghiệp vụ.

Nếu cần ghi log AI hoặc lưu metadata hệ thống, nên:

- Ghi qua Next.js server layer.
- Hoặc dùng service role key ở server-side có kiểm soát rất rõ.

Không được:

- Nhúng key Supabase vào frontend.
- Gọi trực tiếp Supabase admin endpoints từ browser.

## 3. Cấu trúc thư mục chuẩn

### 3.1 Frontend Next.js

Khuyến nghị cấu trúc:

```text
app/
  (auth)/
    sign-in/
    sign-up/
  (dashboard)/
    page.tsx
    history/
    diagnosis/
  api/
    ...route handlers nếu cần
  layout.tsx
  page.tsx
components/
  ui/
  forms/
  layout/
  diagnosis/
features/
  auth/
  diagnosis/
  history/
lib/
  supabase/
  api/
  validators/
types/
  database.ts
  diagnosis.ts
  api.ts
styles/
  globals.css
```

Quy ước:

- `app/`: route và layout.
- `components/`: component tái sử dụng.
- `features/`: nghiệp vụ theo domain.
- `lib/`: helper, client Supabase, fetcher, constants.
- `types/`: toàn bộ type/interface dùng chung.

### 3.2 FastAPI

Khuyến nghị cấu trúc:

```text
app/
  main.py
  config.py
  schemas.py
  routers/
    health.py
    predict.py
    step1.py
    step2.py
  services/
    inference_service.py
    preprocessing_service.py
    recommendation_service.py
    storage_service.py
  controllers/
    predict_controller.py
  models/
  labels/
  utils/
    image.py
    validation.py
    logging.py
```

Quy ước:

- `routers/`: chỉ định nghĩa endpoint.
- `controllers/`: nhận input đã được validate, điều phối luồng.
- `services/`: chứa logic nghiệp vụ chính.
- `schemas.py`: Pydantic request/response schema.
- `utils/`: helper dùng chung.

Nếu repo hiện tại đang gói nhiều logic trong `main.py`, khi thêm chức năng mới phải ưu tiên tách dần sang các layer trên.

## 4. Luồng phát triển chuẩn

Khi thêm một chức năng mới, phải đi theo thứ tự sau:

1. **Khai báo type/interface**
   - Định nghĩa request, response, entity và trạng thái UI trong `types/` hoặc `schemas.py`.
   - Không viết UI hay logic trước khi chốt contract.

2. **Cập nhật Supabase schema nếu cần**
   - Thêm bảng, cột, index hoặc policy RLS.
   - Cập nhật migration hoặc SQL script.

3. **Cập nhật storage rule nếu có file upload**
   - Chọn bucket, path convention, policy và signed URL flow.

4. **Viết logic FastAPI nếu chức năng liên quan AI**
   - Tách preprocessing, inference, post-processing.
   - Chuẩn hóa output thành JSON ổn định.

5. **Viết Server Action hoặc Route Handler bên Next.js**
   - Làm lớp trung gian xác thực, gọi backend và map lỗi.

6. **Viết hoặc cập nhật UI**
   - Chỉ render dữ liệu đã có contract rõ ràng.
   - UI phải có loading, empty state, error state và success state.

7. **Cập nhật logging / audit / history**
   - Ghi nhận request, response, user, timestamp, model version.

8. **Kiểm thử end-to-end**
   - Test luồng thật từ UI -> Supabase -> FastAPI -> UI.
   - Không chấp nhận test chỉ ở một lớp đơn lẻ nếu chức năng chạm nhiều lớp.

9. **Commit theo Conventional Commits**
   - Mỗi commit nên phản ánh một thay đổi logic có thể review được.

## 5. Chuẩn xử lý dữ liệu và trạng thái

### 5.1 Chuẩn dữ liệu ảnh

- Ảnh lá phải được upload lên Supabase Storage trước khi suy luận.
- Path ảnh nên có cấu trúc rõ ràng theo user và thời gian.
- Tránh dùng filename gốc nếu dễ trùng hoặc lộ thông tin.

### 5.2 Chuẩn dữ liệu AI

FastAPI phải trả về JSON có cấu trúc ổn định. Tối thiểu nên có:

```json
{
  "success": true,
  "status": "ok",
  "message": null,
  "data": {
    "plant_label": "Tomato",
    "plant_confidence": 0.91,
    "disease_label": "Tomato___Early_blight",
    "disease_confidence": 0.84,
    "recommendation": "...",
    "recommendation_checklist": {
      "immediate": [],
      "monitor": [],
      "consult": []
    },
    "inconsistent": false,
    "model_loaded": true
  }
}
```

Quy ước:

- `success`: trạng thái tổng quát của request.
- `status`: mã nghiệp vụ, ví dụ `ok`, `low_confidence_plant`, `leaf_not_found`.
- `message`: thông báo dễ đọc cho người dùng.
- `data`: payload nghiệp vụ nếu thành công hoặc nếu có dữ liệu một phần.

### 5.3 Chuẩn trạng thái UI

UI phải phân biệt rõ:

- Loading: đang upload, đang gọi AI, đang lưu DB.
- Success: có kết quả hợp lệ.
- Warning: kết quả cần xác nhận hoặc ảnh chưa đủ tốt.
- Error: request lỗi, auth lỗi, storage lỗi, hoặc AI lỗi.

## 6. Xử lý lỗi & Logging

### 6.1 Quy tắc bắt lỗi

#### Next.js

- Dùng `try/catch` trong Server Action, Route Handler và các hàm fetch server-side.
- Chuyển lỗi nội bộ thành message ngắn, rõ, không lộ secret hoặc stack trace.
- Client Component chỉ nhận thông báo đã được làm sạch.

#### FastAPI

- Dùng `HTTPException` cho lỗi nghiệp vụ hoặc validate.
- Dùng global exception handler nếu cần chuẩn hóa response lỗi.
- Không để lỗi thô của thư viện tràn trực tiếp ra UI.

### 6.2 Chuẩn lỗi API

Response lỗi nên theo format thống nhất:

```json
{
  "success": false,
  "status": "bad_request",
  "message": "Ảnh không hợp lệ.",
  "error": {
    "code": "INVALID_IMAGE",
    "details": null
  }
}
```

Quy tắc:

- `message` phải ngắn và đủ để người dùng hiểu.
- `error.code` phục vụ debug và mapping nội bộ.
- Không trả về token, key, query thô hoặc stack trace cho client.

### 6.3 Logging

Mỗi request quan trọng cần log:

- `request_id`
- `user_id` nếu có
- `endpoint`
- `status`
- `latency_ms`
- `model_version`
- `image_count` hoặc `file_size`

Nguyên tắc:

- Log phải đủ để debug nhưng không phơi dữ liệu nhạy cảm.
- Không log secret, access token, service role key, hoặc nội dung file thô nếu không cần thiết.

## 7. Quy tắc hiển thị lỗi trên UI

- Lỗi auth: yêu cầu đăng nhập lại hoặc refresh session.
- Lỗi upload: báo rõ file nào lỗi nếu là multi-file.
- Lỗi AI: báo ảnh không đạt, model chưa sẵn sàng hoặc kết quả không chắc chắn.
- Lỗi hệ thống: hiển thị message thân thiện và giữ nguyên dữ liệu người dùng đã nhập nếu có thể.

Mapping gợi ý:

- `leaf_not_found` -> "Không phát hiện được lá cây. Hãy chụp rõ hơn."
- `too_many_leaves` -> "Ảnh có quá nhiều lá. Vui lòng chụp/crop lại một lá rõ nét."
- `low_confidence_plant` -> "Độ tin cậy loại cây thấp. Vui lòng thử lại."
- `low_confidence_disease` -> "Độ tin cậy bệnh thấp. Vui lòng chụp lại trong điều kiện tốt hơn."

## 8. Anti-patterns: Các điều cấm

### 8.1 Cấm về kiến trúc

- Không gọi thẳng FastAPI từ Client Component cho chức năng chính nếu có thể đi qua Server Action hoặc Route Handler.
- Không để UI tự ghép logic business mà không có contract type rõ ràng.
- Không nhét toàn bộ logic vào một file lớn nếu chức năng mới có thể tách layer.

### 8.2 Cấm về bảo mật

- Không lưu API key, service role key, secrets hoặc token nhạy cảm trong Client Component.
- Không commit file `.env` thật lên GitHub.
- Không bypass RLS bằng query client-side.
- Không dùng public bucket cho dữ liệu riêng tư nếu chưa có lý do rõ ràng và kiểm soát truy cập.

### 8.3 Cấm về chất lượng code

- Không trả về payload AI không có schema rõ ràng.
- Không hardcode label map hoặc magic string rải rác trong UI.
- Không sửa trực tiếp nhiều lớp cùng lúc khi chưa khóa contract.
- Không tạo component chỉ dùng một lần nhưng chứa logic phức tạp và không tái sử dụng được.

### 8.4 Cấm về quy trình làm việc

- Không code chức năng mới mà không cập nhật type, schema hoặc tài liệu liên quan.
- Không commit gộp tất cả thay đổi lớn trong một lần nếu có thể tách thành milestone nhỏ.
- Không deploy production khi chưa test lại auth, storage, AI flow và HTTPS.

## 9. Checklist trước khi thêm chức năng mới

- [ ] Type/interface đã được xác định.
- [ ] Supabase schema/RLS đã được cập nhật nếu cần.
- [ ] Storage flow đã rõ nếu có upload file.
- [ ] FastAPI contract đã chốt nếu có AI inference.
- [ ] Server Action/Route Handler đã có nếu frontend cần gọi server.
- [ ] UI có loading, error, success state.
- [ ] Logging và history đã được cân nhắc.
- [ ] Có test case tối thiểu cho luồng chính và luồng lỗi.

## 10. Mục tiêu sử dụng tài liệu này

Mỗi khi AI hoặc lập trình viên bắt đầu một task mới, tài liệu này phải được dùng để:

- Chọn đúng lớp cần sửa.
- Không phá contract giữa các thành phần.
- Tránh viết code rác hoặc code tạm không có đường dọn dẹp.
- Giữ dự án đủ sạch để demo, báo cáo và vấn đáp cuối kỳ.
