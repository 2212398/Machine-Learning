# Development Plan - Hệ thống Nhận diện Bệnh trên Lá Cây

## 1. Mục tiêu triển khai

Mục tiêu của kế hoạch này là đưa dự án hiện tại từ trạng thái AI core + frontend cũ sang một sản phẩm hoàn chỉnh, đúng quy chế môn học và đủ tiêu chí để nộp báo cáo, demo và vấn đáp.

Phạm vi bắt buộc của bản hoàn thiện:
- Frontend mới bằng Next.js App Router, dùng Server Components và Client Components đúng chỗ.
- Styling bằng Tailwind CSS.
- Supabase cho Authentication, Database CRUD, Row Level Security và Storage cho upload ảnh.
- Backend AI FastAPI vẫn là microservice suy luận chính với OpenCV + PyTorch + MobileNetV3.
- Đóng gói bằng Docker và triển khai lên VPS có domain + SSL.
- Có lịch sử commit rõ ràng trên GitHub theo Conventional Commits.
- Có báo cáo đầy đủ tối thiểu 20 trang và log lại toàn bộ quá trình dùng AI tool/prompt làm minh chứng.

## 2. Nguyên tắc kiến trúc

- Không phá logic AI lõi hiện có: bước 1 nhận diện cây, bước 2 nhận diện bệnh theo đúng cây đã xác nhận.
- Next.js không thay thế backend AI; Next.js chỉ là lớp UI, auth, orchestration và gọi API.
- Ảnh upload phải đi qua Supabase Storage, sau đó frontend gửi URL hoặc signed URL cho FastAPI phân tích.
- Dữ liệu người dùng, lịch sử chẩn đoán và minh chứng hệ thống phải đi qua Supabase Database với RLS.
- Tách rõ 3 lớp: Frontend Next.js, BaaS Supabase, AI service FastAPI.
- Mọi thay đổi phải bám mục tiêu demo ổn định trên VPS thật, không tối ưu cho local quá mức mà bỏ qua deploy.

## Phase 1: Migrate & Setup

### Mục tiêu
Thay thế frontend cũ bằng Next.js, dựng nền tảng Supabase và chuẩn hóa dữ liệu ứng dụng để toàn bộ luồng người dùng có auth, CRUD và phân quyền.

### Task 1: Khởi tạo frontend Next.js mới
- Giải pháp kỹ thuật: Tạo project Next.js với App Router, TypeScript, Tailwind CSS, ESLint và cấu trúc `app/`, `components/`, `lib/`, `features/`.
- Việc cần làm: dựng layout tổng, navbar, hero section, khu vực upload ảnh, trang kết quả, trang lịch sử chẩn đoán và trang đăng nhập/đăng ký.
- Quy ước kỹ thuật: dùng Server Components cho dữ liệu đọc từ Supabase, dùng Client Components cho upload, preview ảnh, form và thao tác tương tác.

### Task 2: Thiết kế design system tối giản nhưng đủ học thuật
- Giải pháp kỹ thuật: xây Tailwind theme thống nhất, dùng biến màu, spacing, typography rõ ràng; tạo các component nền tảng như Button, Card, Input, Badge, Modal, Toast.
- Việc cần làm: đảm bảo giao diện tiếng Việt, responsive desktop/mobile, có trạng thái loading, empty state, error state và success state.
- Quy ước kỹ thuật: tránh HTML/JS thuần; mọi component tương tác đều nằm trong kiến trúc Next.js chuẩn.

### Task 3: Thiết lập Supabase project
- Giải pháp kỹ thuật: tạo Supabase project riêng cho đồ án, cấu hình env vars trong `.env.local`, kết nối bằng `@supabase/supabase-js`.
- Việc cần làm: bật Auth, tạo bucket Storage cho ảnh lá, chuẩn bị schema database và cấu hình RLS từ đầu.
- Quy ước kỹ thuật: phân biệt rõ `anon key` dùng ở frontend và `service role key` chỉ dùng ở server-side hoặc công cụ quản trị.

### Task 4: Thiết kế Database schema cho CRUD
- Giải pháp kỹ thuật: tạo các bảng tối thiểu gồm `profiles`, `diagnoses`, `diagnosis_images`, `feedbacks` hoặc tương đương theo nhu cầu demo.
- Việc cần làm: lưu user profile, lịch sử chẩn đoán, danh sách ảnh đã upload, kết quả từng lần dự đoán, phản hồi đúng/sai và ghi chú của người dùng.
- Quy ước kỹ thuật: chuẩn hóa khóa ngoại, index theo `user_id`, `created_at`, `plant_label`, `disease_label` để truy vấn lịch sử nhanh.

### Task 5: Thiết lập Row Level Security
- Giải pháp kỹ thuật: viết policy theo nguyên tắc user chỉ thấy dữ liệu của chính mình, admin hoặc service role mới xem được dữ liệu tổng hợp.
- Việc cần làm: policy cho select/insert/update/delete trên từng bảng, policy cho storage object theo user path hoặc folder riêng.
- Quy ước kỹ thuật: test RLS bằng tài khoản khác nhau để tránh lộ lịch sử chẩn đoán giữa các người dùng.

### Task 6: Tích hợp Authentication
- Giải pháp kỹ thuật: dùng Supabase Auth với email/password hoặc magic link tùy phạm vi demo, ưu tiên flow đơn giản và ổn định.
- Việc cần làm: dựng trang sign in, sign up, sign out, session persistence, route protection cho các trang upload và lịch sử.
- Quy ước kỹ thuật: tạo middleware hoặc server-side guard để chặn truy cập khi chưa đăng nhập.

### Task 7: Chuẩn hóa contract dữ liệu giữa UI và backend
- Giải pháp kỹ thuật: định nghĩa TypeScript types cho response từ FastAPI và dữ liệu Supabase; mapping rõ giữa trạng thái AI và UI labels.
- Việc cần làm: chuẩn bị các kiểu dữ liệu cho plant result, disease result, upload metadata, diagnosis record và checklist khuyến nghị.
- Quy ước kỹ thuật: tránh hardcode JSON rời rạc trong component; gom contract vào một lớp `types/` hoặc `lib/`.

### Tiêu chí hoàn thành Phase 1
- Next.js chạy được trên local với layout chính và trang auth.
- Supabase có schema, RLS và storage bucket hoạt động.
- User đăng nhập được, upload được, và dữ liệu lịch sử có thể CRUD đúng quyền.
- Frontend cũ không còn là giao diện chính của sản phẩm.

## Phase 2: Tích hợp Microservice AI

### Mục tiêu
Cho Next.js gọi sang FastAPI AI service một cách ổn định, upload ảnh lên Supabase Storage trước khi suy luận, và hiển thị kết quả nhận diện cây - bệnh trên UI mới.

### Task 1: Thiết kế luồng upload ảnh chuẩn
- Giải pháp kỹ thuật: frontend upload file lên Supabase Storage trước, lấy public URL hoặc signed URL, sau đó gửi URL đó kèm metadata sang backend AI.
- Việc cần làm: đặt naming convention cho file theo `userId/date/uuid`, lưu path ảnh trong database để truy vết.
- Quy ước kỹ thuật: không truyền file nhị phân trực tiếp qua toàn hệ thống nếu có thể tránh được; ưu tiên URL để giảm tải và dễ audit.

### Task 2: Thiết kế API gateway hoặc server action trên Next.js
- Giải pháp kỹ thuật: dùng Server Actions hoặc Route Handlers của Next.js để làm lớp trung gian gọi FastAPI, tránh để frontend gọi thẳng mọi dịch vụ cùng lúc.
- Việc cần làm: xác thực session, lấy token/user context, kiểm tra quyền và forward request hợp lệ tới AI service.
- Quy ước kỹ thuật: lớp trung gian này cũng là nơi ghi log request, response và thời gian xử lý để phục vụ báo cáo.

### Task 3: Kết nối FastAPI với contract mới
- Giải pháp kỹ thuật: giữ nguyên AI inference pipeline hiện có, nhưng bổ sung endpoint nhận image URL hoặc signed download URL từ Supabase Storage nếu phù hợp.
- Việc cần làm: chuẩn hóa response của FastAPI để Next.js render được step 1, step 2, checklist, confidence, trạng thái lỗi và khuyến nghị.
- Quy ước kỹ thuật: nếu cần, thêm endpoint riêng cho health check, step1 plant, step2 disease và predict nhanh để debug.

### Task 4: Lưu lịch sử chẩn đoán vào Supabase Database
- Giải pháp kỹ thuật: sau mỗi lần predict, Next.js ghi một bản ghi diagnosis vào Supabase cùng ảnh, kết quả, thời gian, user và trạng thái.
- Việc cần làm: lưu `plant_label`, `disease_label`, `confidence`, `recommendation`, `status`, `image_path`, `ai_model_version`.
- Quy ước kỹ thuật: tách bảng ảnh và bảng kết quả để dễ thống kê, lọc và làm báo cáo.

### Task 5: Hiển thị kết quả AI trên giao diện mới
- Giải pháp kỹ thuật: xây trang kết quả với step-by-step UI, trạng thái loading, ảnh preview, thẻ kết quả, checklist xử lý và cảnh báo nếu ảnh không đạt.
- Việc cần làm: hỗ trợ nhiều ảnh cho bước bệnh, hiển thị bệnh cuối cùng, bệnh từng ảnh, và giải thích rõ nếu ảnh không phù hợp.
- Quy ước kỹ thuật: mọi trạng thái từ backend phải được map rõ thành tiếng Việt thân thiện nhưng vẫn giữ tính chính xác.

### Task 6: Đồng bộ quản lý file và bảo mật ảnh
- Giải pháp kỹ thuật: dùng signed URL cho ảnh riêng tư hoặc policy Storage theo user nếu demo cần bảo mật cao hơn.
- Việc cần làm: đảm bảo người dùng không xem được ảnh của người khác, đồng thời vẫn cho backend truy cập khi cần suy luận.
- Quy ước kỹ thuật: nếu dùng public bucket cho demo, vẫn phải có folder tách theo user và cơ chế policy phù hợp để giải thích trong báo cáo.

### Task 7: Kiểm thử tích hợp end-to-end
- Giải pháp kỹ thuật: kiểm thử từ upload -> Storage -> FastAPI -> DB -> render UI bằng luồng thực.
- Việc cần làm: test ảnh hợp lệ, ảnh lỗi, ảnh nhiều lá, ảnh không có lá, network failure, và request chưa đăng nhập.
- Quy ước kỹ thuật: ưu tiên thử ngay trên môi trường gần production để phát hiện lỗi contract sớm.

### Tiêu chí hoàn thành Phase 2
- Người dùng có thể đăng nhập, upload ảnh lên Supabase, gọi AI service và nhận kết quả trên Next.js.
- Lịch sử chẩn đoán được lưu và xem lại theo tài khoản.
- Luồng step 1 -> step 2 vẫn giữ đúng logic AI lõi hiện tại.

## Phase 3: Docker & Deployment

### Mục tiêu
Đóng gói hệ thống để chạy ổn định trên VPS thật, có domain và SSL, đủ điều kiện demo công khai cho chấm cuối kỳ.

### Task 1: Viết Dockerfile cho FastAPI
- Giải pháp kỹ thuật: tạo Dockerfile riêng cho backend AI, cài Python dependencies, copy model/label cần thiết, expose port và chạy Uvicorn.
- Việc cần làm: tối ưu image size vừa đủ, thêm biến môi trường cho CPU/GPU mode và các cấu hình inference.
- Quy ước kỹ thuật: tách cấu hình runtime khỏi image để deploy dễ thay đổi trên VPS.

### Task 2: Viết Dockerfile cho Next.js
- Giải pháp kỹ thuật: dựng multi-stage build cho Next.js, cài dependencies, build production, chạy bằng `next start` hoặc standalone output.
- Việc cần làm: bảo đảm env Supabase và API URL được inject lúc runtime.
- Quy ước kỹ thuật: kiểm tra kỹ edge cases của App Router và Server Components khi chạy trong container.

### Task 3: Cấu hình Docker Compose
- Giải pháp kỹ thuật: tạo `docker-compose.yml` cho frontend, backend AI và reverse proxy nếu cần.
- Việc cần làm: quản lý network nội bộ, biến môi trường, volume cho logs và model, mapping port rõ ràng.
- Quy ước kỹ thuật: nếu dùng Nginx/Caddy, đặt nó làm entrypoint để xử lý domain và SSL.

### Task 4: Thiết lập reverse proxy, domain và SSL
- Giải pháp kỹ thuật: dùng Nginx hoặc Caddy trên VPS, trỏ domain về IP VPS, cấp chứng chỉ SSL bằng Let’s Encrypt.
- Việc cần làm: cấu hình HTTPS, redirect HTTP sang HTTPS, phân tách route frontend và API rõ ràng.
- Quy ước kỹ thuật: kiểm tra CORS, cookie auth, và callback URL của Supabase sau khi bật domain thật.

### Task 5: Chuẩn bị VPS và vận hành production
- Giải pháp kỹ thuật: dùng Ubuntu VPS, cài Docker/Docker Compose, mở firewall cần thiết, dùng `.env` production riêng.
- Việc cần làm: setup log rotation, restart policy, health check, và quy trình restart an toàn khi deploy phiên bản mới.
- Quy ước kỹ thuật: giữ script deploy đơn giản để có thể trình bày khi vấn đáp.

### Task 6: CI/CD tối thiểu và lịch sử commit
- Giải pháp kỹ thuật: cấu hình GitHub Actions mức cơ bản cho lint/build/test hoặc ít nhất là build Docker image.
- Việc cần làm: chuẩn hóa Conventional Commits, tách commit theo từng feature/milestone, tránh commit rác.
- Quy ước kỹ thuật: lịch sử commit phải giúp hội đồng nhìn ra tiến trình phát triển thật, không phải một commit lớn cuối kỳ.

### Tiêu chí hoàn thành Phase 3
- Hệ thống chạy được trên VPS qua domain thật với HTTPS.
- Frontend, backend và storage/auth luồng chính hoạt động ổn định trong container.
- Có hướng dẫn deploy lặp lại được, đủ để trình bày trong báo cáo và vấn đáp.

## Phase 4: Hoàn thiện Báo cáo & Tài liệu

### Mục tiêu
Hoàn thiện báo cáo tối thiểu 20 trang, chuẩn bị minh chứng quá trình làm việc với AI tool, và chốt tài liệu demo/vấn đáp trước hạn nộp.

### Task 1: Lên khung báo cáo theo cấu trúc học thuật
- Giải pháp kỹ thuật: chia báo cáo thành phần mở đầu, cơ sở lý thuyết, phân tích yêu cầu, thiết kế hệ thống, triển khai, kiểm thử, đánh giá và kết luận.
- Việc cần làm: mô tả rõ bài toán, kiến trúc hệ thống, lý do chọn Next.js, Supabase, FastAPI, MobileNetV3 và Docker.
- Quy ước kỹ thuật: phần nào có số liệu thì phải có bảng/biểu đồ/minh chứng, không viết mô tả cảm tính chung chung.

### Task 2: Viết phần mô tả kiến trúc và luồng dữ liệu
- Giải pháp kỹ thuật: minh họa sơ đồ hệ thống, sơ đồ sequence, sơ đồ database và luồng xử lý ảnh từ upload đến kết quả.
- Việc cần làm: giải thích luồng auth, storage, AI inference, CRUD lịch sử và RLS.
- Quy ước kỹ thuật: nhấn mạnh tách lớp frontend - BaaS - AI service để hội đồng thấy kiến trúc có chủ đích.

### Task 3: Tổng hợp kết quả triển khai và kiểm thử
- Giải pháp kỹ thuật: chụp màn hình giao diện, bảng test case, log docker, log deploy VPS và kết quả kiểm thử AI.
- Việc cần làm: ghi lại các ca kiểm thử thành công/thất bại, các lỗi đã sửa và cách xác nhận sau sửa.
- Quy ước kỹ thuật: trình bày số liệu gọn, có thể dùng bảng test theo mục tiêu chức năng.

### Task 4: Ghi log sử dụng AI tool và prompt
- Giải pháp kỹ thuật: lưu lại prompt, câu hỏi, kết quả AI hỗ trợ và vai trò của AI trong từng hạng mục, tốt nhất theo timeline hoặc theo task.
- Việc cần làm: chuẩn bị file log riêng hoặc phụ lục để làm minh chứng, tránh viết chung chung kiểu “có dùng AI”.
- Quy ước kỹ thuật: ghi rõ phần nào do AI gợi ý, phần nào do nhóm chỉnh sửa, phần nào được kiểm chứng lại bằng code hoặc test.

### Task 5: Soạn nội dung demo và kịch bản vấn đáp
- Giải pháp kỹ thuật: chuẩn bị slide demo ngắn, kịch bản chạy luồng chính, danh sách câu hỏi thường gặp và câu trả lời ngắn gọn.
- Việc cần làm: chuẩn bị kịch bản 3 phút cho demo live, 1 phút cho fallback khi mạng/VPS lỗi, và câu trả lời cho quyết định kiến trúc.
- Quy ước kỹ thuật: ưu tiên giải thích được trade-off, không chỉ mô tả tính năng.

### Task 6: Rà soát final trước hạn 29/05/2026
- Giải pháp kỹ thuật: checklist cuối cùng gồm báo cáo, link demo, log AI, commit history, docker run guide và tài khoản demo nếu cần.
- Việc cần làm: kiểm tra lại domain, SSL, uptime, quyền truy cập Supabase, seed data và quyền demo.
- Quy ước kỹ thuật: chốt bản release candidate ít nhất 1-2 ngày trước deadline để tránh lỗi phút chót.

### Tiêu chí hoàn thành Phase 4
- Báo cáo đủ độ dài và có nội dung kỹ thuật thật.
- Có minh chứng rõ ràng cho việc dùng AI tool trong quá trình phát triển.
- Có bộ tài liệu để nộp, demo và vấn đáp đúng hạn.

## 3. Lịch triển khai gợi ý theo deadline

### Trước 29/05/2026
- Hoàn thành Phase 1 và Phase 2 sớm nhất có thể.
- Chốt Phase 3 ít nhất vài ngày trước deadline để còn thời gian fix deploy.
- Song song viết báo cáo ngay khi từng phase hoàn thành để tránh dồn cuối kỳ.

### Ngày 29/05/2026
- Nộp báo cáo final.
- Nộp link demo production.
- Khóa các thay đổi lớn, chỉ sửa lỗi thật sự cần thiết.

### Ngày 30/05/2026
- Ôn lại kiến trúc, luồng dữ liệu, RLS, Docker, và lý do chọn công nghệ.
- Chuẩn bị demo live với dữ liệu mẫu, mạng dự phòng và tài khoản test.

## 4. Ưu tiên thực thi thực tế

1. Làm lại frontend bằng Next.js trước, vì đây là thay đổi visible nhất và ảnh hưởng mạnh đến quy chế môn học.
2. Dựng Supabase auth, database và storage ngay sau đó để khóa được luồng dữ liệu thật.
3. Tích hợp AI service qua một contract ổn định, không sửa nội dung model lõi nếu chưa cần.
4. Dockerize sớm để tránh lỗi môi trường cuối kỳ.
5. Viết báo cáo song song với phát triển, không để dồn thành việc sau cùng.
