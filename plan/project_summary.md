# Tóm tắt Dự án: Hệ thống Nhận diện Bệnh trên Lá Cây (Plant Leaf Disease Detection)

## 1. Tên dự án và Mục tiêu
- **Tên dự án**: Hệ thống Nhận diện Bệnh trên Lá Cây
- **Mục tiêu**: Xây dựng một trang web cho phép người dùng tải lên hình ảnh lá cây để nhận diện loại cây và chẩn đoán bệnh tật (nếu có). 
- **Đặc điểm nổi bật (Logic ML)**: Hệ thống sử dụng mô hình hai bước: đầu tiên nhận diện loại cây (Plant type), sau đó mới nhận diện tiếp bệnh (Disease) dựa trên loại cây vừa nhận diện được.

## 2. Công nghệ sử dụng (Tech Stack)
- **Backend**: FastAPI
- **Xử lý ảnh & Machine Learning**: OpenCV, PyTorch
- **Kiến trúc mô hình (Model architecture)**: MobileNetV3 (sử dụng cho việc phân loại cây và bệnh tật)
- **Frontend**: HTML thuần, CSS, JavaScript (Vanilla JS)
- **Môi trường triển khai**: Triển khai cục bộ (Local deployment) hỗ trợ cả CPU và GPU.
- **Ngôn ngữ Frontend**: Tiếng Việt (UI đơn giản, gọn gàng).

## 3. Cấu trúc thư mục chính
- **`code/backend/`**: Mã nguồn của hệ thống Backend, chứa các API FastAPI (`main.py`, `inference.py`), code tiền xử lý (`preprocess.py`), tải mô hình (`models/`), thông tin gợi ý (`recommendations.py`) cùng file `requirements.txt`.
- **`code/frontend/`**: Mã nguồn giao diện người dùng, nơi người dùng sẽ tải ảnh lên và nhận kết quả chẩn đoán (`index.html`, `app.js`, `styles.css`).
- **`code/training/`**: File kịch bản huấn luyện mô hình. Chứa các file để huấn luyện (sử dụng MobileNetV3) cho phân loại cây (`train_plant_mobilenetv3.py`) và bệnh (`train_disease_mobilenetv3.py`), cùng các script xử lý file (`build_plant_split_from_disease_split.py`).
- **`plan/`**: Thư mục lưu trữ các tài liệu chuyên môn hỗ trợ lập kế hoạch (bao gồm file thiết kế kỹ thuật, cấu trúc trang web).
- **`PlantDisease/`**: Nơi lưu trữ tập dữ liệu bệnh (Dataset). Đã được chia nhỏ thành dữ liệu train/val/test theo loại cây và bệnh, sử dụng phương pháp cân bằng lại tập dữ liệu.

## 4. Tiến độ hiện tại
Dựa theo thông tin từ hệ thống và codebase hiện tại, dự án đang đạt tiến độ như sau:
- **Chuẩn bị Dữ liệu (Done)**: Dữ liệu đã được chia tách thành tập Train, Val, Test cho cả cấp độ Cây và Bệnh (`prepared_template_style_plant_split/` và `prepared_template_style_split/`).
- **Hệ thống Frontend (WIP/Done)**: Cấu trúc cơ bản đã hoàn thành (HTML, CSS, JS).
- **Hệ thống Backend (WIP/Done)**: Cấu trúc backend FastAPI đã được tạo và phân tầng chức năng (nhận request, inference, gợi ý xử lý bệnh).
- **Phát triển Model (WIP)**: Các file training script cho MobileNetV3 đã chuẩn bị cùng script PowerShell để khởi chạy quy trình (như `run_train_plant.ps1` và `run_train_disease.ps1`).

## 5. Các bước tiếp theo (Next steps)
- **Huấn luyện mô hình (Model Training)**: Thực thi training cho Plant Model và Disease Model thông qua các kịch bản PowerShell có sẵn. Giám sát quá trình báo cáo training ở thiết bị đầu cuối.
- **Kiểm thử mô hình (Inference Testing)**: Sử dụng các tệp tin `smoke_test_predict.py` (nếu có) để kiểm thử chức năng phỏng đoán từ Model đã train.
- **Tích hợp Backend - Frontend**: Kiểm tra lại toàn diện quy trình giao tiếp API Endpoint (Upload ảnh từ FE -> BE phân tích -> BE trả kết quả dạng chuỗi JSON -> FE hiển thị).
- **Bổ sung nội dung (Content)**: Viết thêm nội dung gợi ý, tư vấn điều trị dựa trên loại bệnh nhận diện được trong `recommendations.py`.
- **Chạy thử toàn hệ thống (E2E Testing)**: Kiểm tra hoạt động tổng thế trên thiết lập của người dùng thông thường và tinh chỉnh lại hiển thị (UI).
