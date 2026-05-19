# Tài liệu Thiết kế Kỹ thuật - Phát hiện Lá Cây và Chẩn đoán Bệnh

Ngày: 2026-04-23
Dự án: Phát hiện lá cây + chẩn đoán bệnh (chạy cục bộ)

## 1. Bài toán và đầu ra

Mục tiêu:
- Xây dựng hệ thống web chạy local, nhận diện loại cây trước rồi chẩn đoán bệnh trong đúng tập bệnh hợp lệ của loại cây đó.
- Phạm vi đang triển khai: 9 loại cây và 33 nhãn bệnh hoặc khỏe mạnh.

Đầu vào:
- Bước 1: 1 ảnh lá cây người dùng tải lên từ thiết bị (JPG hoặc PNG).
- Bước 2: 1 hoặc nhiều ảnh sau khi người dùng xác nhận loại cây.

Đầu ra:
- Kết quả Bước 1: nhãn loại cây, độ tin cậy, độ chênh top-1 và top-2, trạng thái cần xác nhận.
- Kết quả Bước 2: nhãn bệnh cuối cùng, độ tin cậy cuối cùng, khuyến nghị xử lý, trạng thái từng ảnh.
- Đầu ra một bước tùy chọn qua `/api/predict`: loại cây + độ tin cậy + bệnh + độ tin cậy + khuyến nghị trong một phản hồi.

## 2. Ngăn xếp công nghệ

Mô hình AI/ML:
- Framework: PyTorch + TorchVision.
- Kiến trúc: MobileNetV3 (small hoặc large) cho cả mô hình loại cây và mô hình bệnh.
- Chế độ suy luận: hai bước có ràng buộc theo loại cây.
- Tiền xử lý ảnh: OpenCV (resize, tách vùng lá bằng HSV mask, lọc contour).

Backend/API:
- FastAPI + Uvicorn.
- Pydantic cho cấu trúc response.
- NumPy cho chuẩn bị tensor đầu vào.
- Xử lý upload multipart với giới hạn kích thước file, số file, tổng dung lượng.
- Pipeline lưu trữ upload: lưu ảnh gốc + sidecar JSON + manifest JSONL để phục vụ vòng lặp huấn luyện lại.

Frontend:
- HTML, CSS, JavaScript thuần (giao diện tiếng Việt).
- Luồng giao diện hai bước:
  - Bước 1: nhận diện loại cây + tùy chọn xác nhận thủ công.
  - Bước 2: nhận diện bệnh trên nhiều ảnh dựa trên loại cây đã xác nhận.

Quản lý phiên bản:
- Git + GitHub (nhánh, pull request, lịch sử thay đổi).

Môi trường chạy:
- Chạy cục bộ (local deployment).
- Hỗ trợ CPU hoặc GPU thông qua biến môi trường DEVICE.

## 3. Luồng hệ thống

Bước 1:
- Người dùng tải 1 ảnh lá cây lên giao diện web.
- Frontend gửi ảnh tới API POST `/api/step1/plant`.

Bước 2:
- Backend kiểm tra loại file và kích thước, sau đó giải mã bytes ảnh.
- Tiền xử lý tách lá gồm:
  - Gaussian blur
  - HSV green mask
  - lọc contour
- Nếu không có lá hợp lệ hoặc có quá nhiều lá, backend trả thông báo hướng dẫn.

Bước 3:
- Mô hình MobileNetV3 cho loại cây chạy suy luận.
- Backend áp dụng:
  - ngưỡng độ tin cậy loại cây
  - ngưỡng độ chênh top-1 và top-2
- Response trả về danh sách loại cây gợi ý và trạng thái có cần xác nhận người dùng hay không.
- Người dùng xác nhận loại cây trên UI (nếu cần).

Bước 4:
- Người dùng tải 1 hoặc nhiều ảnh bệnh.
- Frontend gửi POST `/api/step2/disease` với:
  - confirmed_plant_label
  - plant_confirmed=true
  - files[]

Bước 5:
- Backend xử lý từng ảnh:
  - kiểm tra định dạng, kích thước và tổng dung lượng lô
  - giải mã ảnh + tách vùng lá
  - suy luận bệnh bằng MobileNetV3 bệnh
  - ràng buộc kết quả theo tập lớp bệnh hợp lệ của loại cây đã xác nhận
- Backend tổng hợp kết quả từng ảnh để suy ra bệnh cuối cùng và độ tin cậy cuối cùng.
- API trả response JSON kèm khuyến nghị.
- Frontend hiển thị chẩn đoán cuối và chi tiết từng ảnh.

Bước 6 (tùy chọn):
- Luồng suy luận một bước cho 1 ảnh có sẵn tại POST `/api/predict` để kiểm thử nhanh.

## 4. Trạng thái hiện tại và mục tiêu

Trạng thái hiện tại của dự án:
- Pipeline hai bước đã chạy xuyên suốt end-to-end (frontend + backend + inference) và đã được đẩy lên GitHub.
- Đã tích hợp nạp mô hình, cơ chế kiểm tra ngưỡng, và ánh xạ khuyến nghị theo đúng nhãn bệnh hiện có.
- Khuyến nghị xử lý đã được chuẩn hóa thành checklist 3 phần cho từng bệnh: việc cần làm ngay, theo dõi, và khi nào nên hỏi kỹ thuật viên địa phương.
- UI đã có hướng dẫn chụp lại theo lỗi cụ thể cho các trường hợp: không phát hiện lá, nhiều lá, độ tin cậy thấp, và ảnh mờ/ngược sáng.
- Hệ thống lưu upload và manifest đang hoạt động để mở rộng dữ liệu huấn luyện.
- Đã có script huấn luyện MobileNetV3 cho cả loại cây và bệnh; flow chạy riêng plant/disease trong hai terminal.
- Kiểm tra lỗi tĩnh hiện tại không phát hiện lỗi trong thư mục code.
- Tài liệu dữ liệu khuyến nghị đã chuyển sang cấu trúc có `summary` và `checklist`, với checklist thủ công theo từng bệnh.

Rủi ro hoặc khoảng trống kỹ thuật hiện tại:
- Độ sẵn sàng production còn hạn chế: chưa có CI, chưa có test tự động đầy đủ, và chưa có benchmark hiệu năng ổn định.
- Mô hình vẫn phụ thuộc vào chất lượng ảnh đầu vào; ảnh mờ, nhiều lá, hoặc thiếu tương phản có thể làm giảm độ tin cậy.
- Hiệu chỉnh ngưỡng theo từng loại cây vẫn cần lặp thêm nếu muốn tối ưu độ chính xác thực tế.
- Nếu mở rộng thêm cây/bệnh, cần đồng bộ lại label, checklist, và bộ dữ liệu huấn luyện.

Những hạng mục cần hỗ trợ tiếp theo:
- Viết báo cáo kiến trúc mô hình và hiệu chỉnh ngưỡng (rationale của gate, mẫu nhầm lẫn).
- Bổ sung test tự động cho API bước 1, bước 2 và các payload biên.
- Cải thiện theo dõi chất lượng suy luận bằng lịch sử dự đoán và đánh dấu đúng/sai theo phản hồi người dùng.
- Cân nhắc thêm Docker để đóng gói chạy local dễ hơn trên máy mới.
- Nếu tiếp tục mở rộng sản phẩm, nên bổ sung CI và bộ kiểm thử hồi quy cho UI/API.

## 5. Kiến trúc triển khai chi tiết

Hệ thống hiện chia thành 3 lớp chính:

- Frontend trình duyệt: nhận ảnh, hiển thị preview, điều phối flow Bước 1/Bước 2, render khuyến nghị và checklist.
- Backend FastAPI: xác thực payload, giới hạn upload, tiền xử lý ảnh, gọi model, trả JSON cho frontend, lưu archive dữ liệu.
- Lớp ML: MobileNetV3 cho plant classifier và disease classifier, dùng chung pipeline chuẩn hóa ảnh và suy luận trên CPU/GPU.

Các module backend chính:

- `config.py`: gom toàn bộ biến môi trường, đường dẫn model/label và giới hạn upload.
- `preprocess.py`: tách vùng lá bằng OpenCV để giảm nhiễu trước suy luận.
- `inference.py`: đóng gói logic load model, chuẩn hóa ảnh, suy luận plant/disease và ràng buộc theo loại cây.
- `recommendations.py`: ánh xạ nhãn bệnh sang khuyến nghị và checklist xử lý.
- `main.py`: định nghĩa các route API, validate upload, tổng hợp response và lưu archive.
- `schemas.py`: định nghĩa cấu trúc response chuẩn cho frontend.

Luồng dữ liệu runtime:

1. Ảnh từ frontend đi qua API.
2. Backend giải mã, kiểm tra kích thước và tách lá.
3. Nếu ảnh hợp lệ, backend đưa tensor vào model plant/disease.
4. Kết quả được chuẩn hóa thành response JSON.
5. Frontend render kết quả, checklist xử lý và hướng dẫn chụp lại nếu cần.

## 6. API và contract dữ liệu

Các endpoint chính đang dùng:

- `GET /api/health`: kiểm tra trạng thái hệ thống, model đã load hay chưa, giới hạn runtime và một số cấu hình an toàn.
- `POST /api/step1/plant`: nhận 1 ảnh lá để nhận diện loại cây.
- `POST /api/step2/disease`: nhận 1 hoặc nhiều ảnh bệnh sau khi đã xác nhận loại cây.
- `POST /api/predict`: luồng một bước cho kiểm thử nhanh, nếu bật cờ legacy.

Response Bước 1 bao gồm:

- `plant_label`
- `plant_confidence`
- `top1_top2_margin`
- `requires_confirmation`
- `auto_confirmed`
- `can_confirm`
- `too_many_leaves`
- `leaf_candidate_count`
- `top_candidates`
- `step2_access_token`
- `status` và `message`

Response Bước 2 bao gồm:

- `final_disease_label`
- `final_disease_confidence`
- `recommendation`
- `recommendation_checklist`
- `image_count`, `successful_images`, `failed_images`
- `mismatched_plant_images`, `unverified_plant_images`, `duplicate_images`
- `per_image[]` cho từng ảnh

Một số tình huống lỗi được chuẩn hóa:

- Không phát hiện lá: trả lỗi ngay từ bước preprocess.
- Quá nhiều lá: yêu cầu chụp/crop lại để chỉ còn 1 lá.
- Độ tin cậy thấp: yêu cầu xác nhận thủ công hoặc chụp lại.
- Sai loại cây ở Bước 2: từ chối để tránh chẩn đoán lệch ngữ cảnh.

## 7. Cấu hình và artefact

Đường dẫn model và label mặc định:

- `backend/app/models/plant_mobilenetv3.pt`
- `backend/app/models/disease_mobilenetv3.pt`
- `backend/app/labels/plant_labels.json`
- `backend/app/labels/disease_labels_flat.json`
- `backend/app/labels/disease_labels_by_plant.json`
- `backend/app/labels/recommendations_vi.json`

Các biến môi trường chính:

- `DEVICE`: `auto`, `cpu`, hoặc `cuda`
- `PLANT_BACKBONE`, `DISEASE_BACKBONE`
- `PLANT_THRESHOLD`, `DISEASE_THRESHOLD`
- `PLANT_GATE_CONFIDENCE`, `PLANT_GATE_MARGIN`
- `UPLOAD_ARCHIVE_ENABLED`, `UPLOAD_ARCHIVE_DIR`
- `UPLOAD_MAX_IMAGE_BYTES`, `STEP2_MAX_FILES`, `STEP2_MAX_TOTAL_BYTES`
- `REQUIRE_STEP2_FLOW_TOKEN`, `STEP2_FLOW_TOKEN_SECRET`, `STEP2_FLOW_TOKEN_TTL_SEC`
- `STEP2_STRICT_PLANT_MATCH`

Artefact dữ liệu lưu trữ:

- Ảnh gốc upload
- Sidecar JSON chứa metadata suy luận
- Manifest JSONL theo ngày để phục vụ pipeline tái huấn luyện

## 8. Quy trình chạy và triển khai local

Chuẩn bị môi trường:

1. Tạo virtual environment.
2. Cài dependencies từ `code/backend/requirements.txt`.
3. Đặt model đã train vào thư mục `backend/app/models`.
4. Khởi chạy backend bằng Uvicorn.
5. Mở frontend trên cùng server FastAPI hoặc qua static route.

Lệnh chạy tham chiếu:

```powershell
py -m uvicorn backend.app.main:app --app-dir code --host 127.0.0.1 --port 8000
```

Quy trình train hiện tại:

- Train plant và disease bằng 2 terminal riêng để quan sát log rõ hơn.
- Có script mở đồng thời 2 terminal train nếu cần.
- Kết quả train có thể xuất sang mô hình deploy và archive in-scope để tái huấn luyện.

Nếu đóng gói bằng Docker, cấu hình tối thiểu nên gồm:

- Một image cho backend + frontend static assets.
- Volume mount cho thư mục model/label/archive nếu muốn thay đổi dữ liệu mà không build lại image.
- Biến môi trường để chọn CPU/GPU và bật/tắt archive.

## 9. Kiểm thử và đánh giá

Các lớp kiểm thử nên có:

- Test API Bước 1 với ảnh hợp lệ, ảnh không phải lá, ảnh nhiều lá, ảnh mờ.
- Test API Bước 2 với nhiều ảnh cùng cây, ảnh lệch cây, ảnh trùng lặp, ảnh không hợp lệ.
- Test fallback nhãn `unknown_*` và checklist hiển thị.
- Test contract JSON để tránh đổi schema làm hỏng frontend.

Các chỉ số đánh giá nên theo dõi:

- Độ chính xác plant classifier.
- Độ chính xác disease classifier theo từng cây.
- Tỷ lệ ảnh bị loại vì không phát hiện lá hoặc nhiều lá.
- Tỷ lệ request cần xác nhận thủ công.
- Thời gian suy luận trung bình trên CPU và GPU.

## 10. Hướng phát triển tiếp theo

Ưu tiên ngắn hạn:

- Thêm lịch sử dự đoán để người dùng xem lại các kết quả trước đó.
- Bổ sung nút phản hồi đúng/sai để thu thập dữ liệu cải thiện model.
- Viết test tự động và chạy CI cơ bản trên GitHub.
- Đóng gói Docker để triển khai local dễ hơn trên máy mới.

Ưu tiên trung hạn:

- Tinh chỉnh ngưỡng theo từng loại cây nếu dữ liệu cho phép.
- Bổ sung dashboard nhỏ cho thống kê chất lượng suy luận và lỗi đầu vào.
- Mở rộng bộ label/cây nếu có thêm dữ liệu được chuẩn hóa.
