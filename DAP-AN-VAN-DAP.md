# Đáp Án Vấn Đáp - Bộ Câu Hỏi 1-60

> Cách học nhanh: mỗi câu trả lời đi theo 3 ý: **nói khái niệm ngắn**, **nói vì sao dùng trong dự án**, **nói 1 ví dụ thực tế**.
>
> Tài liệu này hiện được chia theo nhóm chủ đề để bạn học từng chặng, nhưng đã bao phủ đủ 60 câu hỏi theo cùng một phong cách trả lời.

## Câu 1. Next.js là gì, và vì sao em chọn Next.js cho dự án?
- Next.js là framework xây trên React, giúp làm web nhanh hơn vì có sẵn routing, server rendering, API routes và tối ưu build.
- Em chọn Next.js vì dự án của em cần vừa có giao diện người dùng, vừa có phần gọi dữ liệu, vừa cần tách rõ phần server và client.
- Trong đồ án nhận diện bệnh lá cây, Next.js giúp em làm các trang như đăng nhập, upload ảnh, xem kết quả và lịch sử chẩn đoán trên cùng một nền tảng.
- Điểm mạnh của Next.js trong dự án của em là nó hỗ trợ tốt App Router, Server Components và Server Actions, nên code gọn hơn và bảo mật hơn.
- Nếu giảng viên hỏi ngắn gọn: em dùng Next.js vì nó phù hợp cho web app hiện đại, chạy tốt với Supabase và dễ triển khai lên VPS.

## Câu 2. App Router trong Next.js là gì?
- App Router là cơ chế routing mới của Next.js, tổ chức trang theo thư mục trong `app/`.
- Mỗi folder có thể đại diện cho một route, ví dụ trang `sign-in`, `dashboard`, `history`.
- Em chọn App Router vì nó tách layout, page và component rất rõ, dễ quản lý khi dự án lớn dần.
- Trong dự án của em, App Router giúp giữ phần auth, phần chẩn đoán và phần lịch sử tách biệt nhưng vẫn dùng chung layout.
- Nói ngắn: App Router làm cấu trúc dự án rõ ràng hơn và hợp với cách xây ứng dụng nhiều màn hình như đồ án của em.

## Câu 3. Server Component và Client Component khác nhau thế nào?
- Server Component chạy ở server, phù hợp cho phần đọc dữ liệu, render nhanh và không cần tương tác nhiều.
- Client Component chạy ở trình duyệt, phù hợp cho form, upload ảnh, chọn file, bấm nút và các thao tác có state.
- Trong dự án của em, những phần như trang lịch sử có thể dùng Server Component, còn upload ảnh và màn hình kết quả nên dùng Client Component.
- Cách này giúp giảm JavaScript gửi xuống trình duyệt, nên web nhẹ hơn và chạy nhanh hơn.
- Nói dễ nhớ: cái nào chỉ để hiển thị dữ liệu thì để server làm, cái nào cần người dùng bấm và tương tác thì để client làm.

## Câu 4. `use client` dùng để làm gì?
- `use client` là directive báo cho Next.js biết component này phải chạy ở phía trình duyệt.
- Nó cần khi component dùng `useState`, `useEffect`, event handler, hoặc thao tác trực tiếp với file upload, input, modal.
- Trong dự án của em, các component như nút upload ảnh, chọn file, hoặc xem checklist khuyến nghị đều cần `use client`.
- Nếu không dùng `use client` mà lại viết logic tương tác, Next.js sẽ báo lỗi vì Server Component không xử lý được state và event như client.
- Ví dụ cực ngắn:

```tsx
"use client";

export default function UploadButton() {
  return <button>Upload ảnh</button>;
}
```

## Câu 5. Server Actions là gì, và em dùng chúng khi nào?
- Server Actions là cách để Next.js cho phép frontend gọi một hàm chạy ở server mà không cần tự viết API riêng cho từng thao tác nhỏ.
- Em dùng Server Actions khi cần xử lý nhạy cảm như ghi dữ liệu, lấy session, hoặc làm lớp trung gian trước khi gọi service khác.
- Trong dự án của em, Server Actions hợp với các thao tác như lưu lịch sử chẩn đoán, gửi request hợp lệ lên backend AI, hoặc tạo signed URL.
- Ưu điểm là giảm boilerplate, code ngắn hơn so với tự tạo nhiều REST endpoint nhỏ.
- Ví dụ cực ngắn:

```tsx
"use server";

export async function saveDiagnosis(data: unknown) {}
```

## Câu 6. Tailwind CSS giúp gì cho dự án?
- Tailwind CSS là thư viện utility-first, tức là em ghép các class nhỏ trực tiếp trong HTML/JSX để tạo giao diện.
- Em chọn Tailwind vì làm giao diện nhanh, đồng bộ, dễ responsive và ít phải viết CSS rời.
- Trong dự án nhận diện bệnh lá cây, Tailwind giúp em dựng nhanh các card kết quả, form upload, modal hướng dẫn và trang lịch sử.
- Nó rất hợp với Next.js vì component hóa tốt, tái sử dụng nhanh và dễ giữ cùng một design system.
- Nói đơn giản: Tailwind giúp em làm UI gọn, đều và dễ chỉnh khi phải chạy demo gấp.

## Câu 7. Supabase là gì, và vì sao em dùng Supabase thay vì tự làm backend toàn bộ?
- Supabase là một Backend-as-a-Service, cung cấp sẵn Authentication, Database, Storage và Row Level Security.
- Em dùng Supabase vì đồ án của em cần đăng nhập, lưu lịch sử chẩn đoán, upload ảnh và phân quyền dữ liệu nhưng không muốn tự viết toàn bộ backend cho các phần đó.
- Khi dùng Supabase, em tập trung vào logic nghiệp vụ và AI, còn phần auth, lưu file, lưu dữ liệu thì dùng dịch vụ có sẵn và ổn định hơn.
- Trong project của em, Supabase làm lớp dữ liệu và bảo mật, còn FastAPI chỉ lo suy luận AI.
- Nói ngắn: Supabase giúp em làm nhanh, an toàn hơn và giảm rất nhiều công sức triển khai backend phổ thông.

## Câu 8. Supabase Auth hoạt động thế nào trong dự án của em?
- Supabase Auth quản lý đăng ký, đăng nhập, đăng xuất và session của người dùng.
- Khi user đăng nhập, app nhận session để biết ai đang thao tác và lưu đúng lịch sử cho người đó.
- Trong dự án của em, Auth là nền tảng để người dùng upload ảnh, xem lịch sử chẩn đoán riêng và không nhìn thấy dữ liệu của người khác.
- Em có thể dùng email/password hoặc magic link tùy demo, nhưng mục tiêu là flow đơn giản và dễ bảo vệ.
- Nói dễ nhớ: Auth xác định danh tính, từ đó mới cho phép lưu và xem dữ liệu đúng người.

## Câu 9. Row Level Security (RLS) là gì, và em dùng nó ra sao?
- RLS là cơ chế phân quyền ở mức từng dòng dữ liệu trong database.
- Nghĩa là cùng một bảng `diagnoses`, nhưng user A chỉ đọc được dòng của mình, user B cũng chỉ đọc được dòng của mình.
- Em dùng RLS vì dự án có lịch sử chẩn đoán cá nhân, nên không thể để ai cũng xem dữ liệu của người khác.
- Trong đồ án nhận diện bệnh lá cây, RLS bảo vệ lịch sử ảnh upload, kết quả đoán bệnh và feedback của từng tài khoản.
- Ví dụ dễ nói: thay vì kiểm tra quyền ở mỗi màn hình, em đặt rule ngay ở database để chặn từ gốc.

## Câu 10. Supabase Storage dùng để làm gì trong dự án của em?
- Supabase Storage là nơi lưu file, trong dự án của em chủ yếu là ảnh lá cây người dùng upload lên.
- Em dùng Storage thay vì nhét ảnh vào database vì ảnh là file lớn, còn database nên giữ dữ liệu có cấu trúc như tên bệnh, độ tin cậy, thời gian.
- Quy trình của em là: user upload ảnh lên Storage, frontend lấy URL hoặc signed URL, rồi gửi sang FastAPI để suy luận.
- Cách này giúp dễ quản lý file, dễ phân quyền, và dễ trace lại ảnh nào đã dùng để chẩn đoán.
- Nếu hỏi sát dự án: ảnh của người dùng được lưu riêng, còn kết quả AI và lịch sử chẩn đoán được lưu ở bảng database.

## Mẹo trả lời nhanh khi bị hỏi xoáy
- Nếu hỏi "vì sao không dùng React thuần": em nói Next.js có routing, server rendering và cấu trúc rõ ràng hơn, phù hợp project lớn.
- Nếu hỏi "vì sao không tự làm auth": em nói Supabase Auth giúp tiết kiệm thời gian, ổn định và có sẵn session + RLS.
- Nếu hỏi "vì sao cần tách server/client": em nói để bảo mật, giảm tải và giữ đúng vai trò từng lớp trong hệ thống.
- Nếu hỏi "dự án của em an toàn ở đâu": em nói an toàn ở chỗ dữ liệu riêng tư đi qua Supabase Auth + RLS, còn phần AI chạy riêng qua FastAPI.

## Câu chốt ngắn để nhớ cả nhóm
- Next.js là lớp giao diện và điều phối.
- Supabase là lớp dữ liệu, auth và lưu file.
- FastAPI là lớp AI suy luận.
- Ba lớp tách nhau rõ thì code dễ bảo trì, dễ demo và dễ giải thích khi vấn đáp.

# Đáp Án Vấn Đáp - Nhóm 1.3: React & TypeScript

> Phần này mình viết tiếp theo cùng phong cách: ngắn, dễ nói, và bám sát cách em triển khai dự án thật.

## Câu 11. React component là gì?
- React component là một khối giao diện có thể tái sử dụng, ví dụ như nút bấm, card kết quả, form đăng nhập.
- Em dùng component để chia giao diện thành từng phần nhỏ, dễ đọc và dễ bảo trì.
- Trong dự án nhận diện bệnh lá cây, em tách riêng component cho upload ảnh, kết quả chẩn đoán, checklist khuyến nghị và lịch sử.
- Cách này giúp khi sửa một phần thì không phải đụng vào toàn bộ trang.
- Nói ngắn: component là cách chia nhỏ giao diện thành từng mảnh rõ ràng.

## Câu 12. Props là gì?
- Props là dữ liệu truyền từ component cha xuống component con.
- Em dùng props khi một component cần nhận thông tin như tên bệnh, độ tin cậy, trạng thái loading hoặc text hiển thị.
- Trong dự án của em, card kết quả nhận props từ màn hình chẩn đoán để render đúng dữ liệu từng lần đoán.
- Props giúp component linh hoạt hơn vì cùng một component có thể dùng cho nhiều dữ liệu khác nhau.
- Ví dụ dễ nhớ: cha truyền dữ liệu, con chỉ nhận và hiển thị.

## Câu 13. State là gì?
- State là dữ liệu thay đổi theo thời gian trong component, ví dụ như file đã chọn, trạng thái đang upload hay kết quả vừa nhận được.
- Em dùng state khi giao diện cần phản hồi ngay với thao tác người dùng.
- Trong dự án của em, state dùng cho preview ảnh, bật/tắt modal, hiển thị loading khi đang gọi AI.
- Nếu không có state thì giao diện sẽ tĩnh và không phản ứng theo hành động người dùng.
- Nói ngắn: state là phần nhớ tạm của component.

## Câu 14. `useEffect` dùng khi nào?
- `useEffect` dùng khi em muốn chạy một đoạn code sau khi component render, thường là để fetch data, lắng nghe sự kiện hoặc đồng bộ với bên ngoài.
- Em dùng nó khi cần lấy session, tải dữ liệu lịch sử, hoặc cập nhật trạng thái sau khi component xuất hiện.
- Trong dự án của em, `useEffect` hợp cho các màn hình cần load dữ liệu từ Supabase sau khi vào trang.
- Không nên lạm dụng `useEffect` cho mọi thứ, vì dễ làm code rối nếu dùng sai.
- Ví dụ cực ngắn:

```tsx
useEffect(() => {
  loadHistory();
}, []);
```

## Câu 15. `useMemo` và `useCallback` dùng để làm gì?
- `useMemo` dùng để ghi nhớ kết quả tính toán, còn `useCallback` dùng để ghi nhớ một hàm.
- Em chỉ dùng khi có chỗ tính toán nặng hoặc khi truyền callback xuống component con mà muốn tránh render lại không cần thiết.
- Trong dự án của em, nếu phải lọc danh sách lịch sử hoặc xử lý checklist lớn thì mới cân nhắc dùng.
- Em không dùng tràn lan vì tối ưu sớm quá cũng làm code khó đọc hơn.
- Nói ngắn: chỉ dùng khi thật sự có lợi cho hiệu năng.

## Câu 16. TypeScript là gì, và vì sao em chọn TypeScript?
- TypeScript là JavaScript có thêm kiểu dữ liệu tĩnh.
- Em chọn TypeScript vì dự án có nhiều dữ liệu từ Supabase, từ FastAPI và từ UI, nên cần type rõ để tránh lỗi lúc chạy.
- Với TypeScript, em bắt được lỗi sớm hơn, nhất là khi đổi contract API hoặc đổi cấu trúc dữ liệu database.
- Trong đồ án nhận diện bệnh lá cây, TypeScript giúp giảm lỗi khi render kết quả AI và checklist khuyến nghị.
- Nói ngắn: TypeScript giúp code an toàn và dễ bảo trì hơn.

## Câu 17. `interface` và `type` khác nhau thế nào?
- Cả hai đều dùng để định nghĩa kiểu dữ liệu, nhưng `interface` thường hợp cho object và có thể mở rộng tốt.
- `type` linh hoạt hơn, dùng được cho union, tuple hoặc alias phức tạp.
- Trong dự án của em, em dùng cái nào tiện cho mục đích cụ thể, miễn sao contract rõ ràng.
- Nếu dữ liệu là object chuẩn thì `interface` rất dễ đọc; nếu cần union kiểu trạng thái thì `type` thường hợp hơn.
- Nói ngắn: cùng là định nghĩa kiểu, nhưng `interface` thiên về object còn `type` linh hoạt hơn.

## Câu 18. Union type là gì?
- Union type là kiểu cho phép một biến nhận nhiều kiểu khác nhau, ví dụ `"loading" | "success" | "error"`.
- Em dùng union type để biểu diễn trạng thái UI trong dự án, vì mỗi màn hình có thể đang chờ, thành công hoặc lỗi.
- Cách này giúp code rõ hơn là dùng chuỗi rời rạc hoặc boolean quá đơn giản.
- Trong đồ án của em, union type rất hợp cho trạng thái chẩn đoán, trạng thái upload và trạng thái feedback.
- Nói dễ nhớ: union type là kiểu "hoặc cái này, hoặc cái kia".

## Câu 19. Generic là gì, và có lợi gì?
- Generic là cách viết kiểu dữ liệu tổng quát, để một hàm hoặc component làm việc với nhiều kiểu khác nhau.
- Em dùng generic khi muốn code reusable mà vẫn giữ type an toàn.
- Ví dụ trong dự án, một hàm xử lý API có thể nhận nhiều kiểu response khác nhau nhưng vẫn được TypeScript kiểm tra.
- Generic giúp giảm lặp code và giữ contract chặt hơn.
- Nói ngắn: generic là kiểu "dùng chung nhưng vẫn không mất an toàn kiểu".

## Câu 20. Vì sao không nên dùng `any` quá nhiều?
- `any` làm TypeScript mất ý nghĩa vì nó cho phép mọi kiểu dữ liệu đi qua mà không kiểm tra.
- Nếu dùng `any` nhiều, lỗi sẽ bị dời sang lúc chạy, lúc đó sửa sẽ khó hơn.
- Trong dự án của em, em cố định nghĩa type cho response AI, dữ liệu Supabase và checklist để tránh `any`.
- Khi cần, em chỉ dùng `any` tạm thời lúc debug, rồi phải thay bằng type rõ ràng ngay.
- Nói ngắn: `any` là đường tắt, nhưng nếu lạm dụng thì dễ làm hỏng độ an toàn của code.

## Câu chốt ngắn để nhớ nhóm React & TypeScript
- React giúp tách UI thành component.
- Props là dữ liệu truyền xuống, state là dữ liệu thay đổi trong component.
- `useEffect` dùng để chạy side effect.
- TypeScript giúp em kiểm soát contract dữ liệu và giảm lỗi khi dự án có nhiều phần như Next.js, Supabase và FastAPI.

# Đáp Án Vấn Đáp - Nhóm 1.4: JavaScript, Async và API

> Nhóm này em có thể trả lời theo hướng rất thực tế: web app của em phải gọi dữ liệu, upload ảnh, nhận kết quả AI và xử lý lỗi nên mấy khái niệm này dùng rất nhiều.

## Câu 21. `async/await` là gì?
- `async/await` là cách viết bất đồng bộ cho dễ đọc hơn so với Promise thuần.
- Em dùng nó khi gọi API, upload ảnh, hoặc chờ kết quả từ Supabase và FastAPI.
- Trong dự án của em, chụp ảnh xong thì phải đợi upload và đợi AI suy luận, nên `async/await` giúp code rõ luồng hơn.
- Nói ngắn: nó làm code chờ đợi dễ hiểu giống như code đồng bộ.
- Ví dụ cực ngắn:

```ts
const result = await fetch("/api/predict");
```

## Câu 22. Promise là gì?
- Promise là một đối tượng đại diện cho kết quả sẽ có trong tương lai, có thể thành công hoặc thất bại.
- Trước khi có `async/await`, người ta hay dùng `then/catch` để xử lý Promise.
- Trong dự án của em, các thao tác gọi mạng như upload ảnh hoặc lấy dữ liệu lịch sử đều là dạng Promise.
- Promise giúp em quản lý trạng thái chờ và lỗi rõ hơn.
- Nói ngắn: Promise là lời hứa về một kết quả chưa có ngay.

## Câu 23. Fetch API là gì?
- Fetch API là hàm có sẵn của trình duyệt để gửi request HTTP.
- Em dùng fetch khi Next.js cần gọi route handler, gọi API backend hoặc lấy dữ liệu từ một endpoint.
- Trong dự án của em, fetch là cầu nối để frontend gửi ảnh hoặc metadata sang backend AI.
- Ưu điểm là gọn, chuẩn web, và không cần thư viện quá nặng nếu nhu cầu đơn giản.
- Nói ngắn: fetch là cách frontend gọi server phổ biến nhất.

## Câu 24. REST API là gì?
- REST API là kiểu thiết kế API dựa trên tài nguyên, thường dùng các method như GET, POST, PUT, DELETE.
- Em dùng tư duy REST khi chia chức năng chẩn đoán, lịch sử, feedback và export dữ liệu.
- Trong dự án của em, ví dụ GET để lấy lịch sử, POST để tạo chẩn đoán mới hoặc gửi feedback.
- REST dễ hiểu, dễ test và hợp với cả frontend lẫn backend tách lớp.
- Nói ngắn: REST là cách tổ chức API rõ ràng, dễ đoán và dễ dùng.

## Câu 25. HTTP status code quan trọng thế nào?
- HTTP status code cho em biết request thành công hay lỗi, ví dụ 200, 201, 400, 401, 403, 500.
- Em dùng status code để frontend biết nên hiện kết quả thành công hay báo lỗi.
- Trong dự án của em, nếu người dùng chưa đăng nhập thì có thể trả 401, còn ảnh sai định dạng thì trả 400.
- Cách này giúp debug nhanh và giao tiếp giữa frontend với backend rõ ràng hơn.
- Nói ngắn: status code là ngôn ngữ chung để server báo trạng thái cho client.

## Câu 26. JSON là gì?
- JSON là định dạng dữ liệu phổ biến khi frontend và backend trao đổi với nhau.
- Em dùng JSON cho response AI, dữ liệu lịch sử chẩn đoán và payload gửi đi từ frontend.
- Trong dự án của em, kết quả dự đoán bệnh trả về dạng JSON để UI render được tên cây, tên bệnh, confidence và khuyến nghị.
- JSON nhẹ, dễ đọc và gần như là chuẩn mặc định của web API.
- Nói ngắn: JSON là format dữ liệu dùng nhiều nhất khi web app nói chuyện với server.

## Câu 27. CORS là gì?
- CORS là cơ chế trình duyệt dùng để kiểm soát website nào được phép gọi sang domain khác.
- Em phải chú ý CORS vì frontend, Supabase và FastAPI có thể chạy ở các domain hoặc port khác nhau.
- Trong dự án của em, nếu cấu hình CORS không đúng thì frontend sẽ không gọi được backend AI.
- Nói ngắn: CORS là lớp bảo vệ của trình duyệt khi một trang web gọi sang nguồn khác.
- Ví dụ dễ nói: nếu frontend ở domain A mà API ở domain B thì server phải cho phép thì browser mới cho chạy.

## Câu 28. Token hoặc session dùng để làm gì?
- Token hoặc session dùng để xác thực người dùng đã đăng nhập hay chưa.
- Em cần nó để biết ai đang upload ảnh, ai đang xem lịch sử và ai được phép sửa dữ liệu của mình.
- Trong dự án của em, session từ Supabase giúp giữ trạng thái đăng nhập ổn định giữa các lần tải trang.
- Cách này quan trọng vì dữ liệu chẩn đoán là dữ liệu cá nhân, không thể để mở tự do.
- Nói ngắn: token/session là bằng chứng cho biết người dùng là ai.

## Câu 29. Error handling là gì?
- Error handling là cách mình xử lý lỗi một cách có kiểm soát thay vì để app vỡ luôn.
- Em dùng nó để báo lỗi khi upload fail, AI trả về lỗi, hoặc ảnh không hợp lệ.
- Trong dự án của em, error handling rất quan trọng vì có nhiều điểm có thể lỗi: file upload, gọi API, đọc dữ liệu Supabase.
- Nếu bắt lỗi tốt thì giao diện sẽ hiện thông báo rõ ràng, không làm người dùng bị đứng màn hình.
- Nói ngắn: error handling là cách làm app không sập khi có lỗi.

## Câu 30. Vì sao frontend không gọi trực tiếp mọi service?
- Vì gọi trực tiếp mọi service sẽ dễ lộ thông tin nhạy cảm, khó kiểm soát lỗi và khó log.
- Em để Next.js làm lớp trung gian để kiểm tra session, chuẩn hóa request rồi mới gọi Supabase hoặc FastAPI khi cần.
- Trong dự án nhận diện bệnh lá cây, cách này giúp em quản lý upload, history và AI contract an toàn hơn.
- Nó cũng giúp sau này đổi backend mà UI ít phải sửa.
- Nói ngắn: nên có một lớp điều phối ở giữa để kiểm soát bảo mật và logic tốt hơn.

## Câu chốt ngắn để nhớ nhóm JavaScript & API
- `async/await` giúp code bất đồng bộ dễ đọc.
- Fetch, JSON, HTTP và REST là ngôn ngữ giao tiếp giữa frontend và backend.
- CORS, token/session và error handling giúp hệ thống an toàn và ổn định hơn.
- Với dự án của em, các khái niệm này xuất hiện nhiều nhất ở upload ảnh, gọi AI và lưu lịch sử chẩn đoán.

# Đáp Án Vấn Đáp - Nhóm 1.5: CSS, UI và Responsive

> Nhóm này em trả lời theo kiểu: làm sao để giao diện đẹp vừa đủ, dễ dùng, và demo không bị rối trên cả desktop lẫn điện thoại.

## Câu 31. CSS là gì?
- CSS là ngôn ngữ dùng để tạo kiểu cho giao diện web.
- Em dùng CSS để điều khiển màu sắc, khoảng cách, bố cục, font chữ và trạng thái hiển thị.
- Trong dự án của em, CSS giúp trang chẩn đoán nhìn rõ ràng hơn, card kết quả nổi bật hơn và nút bấm dễ thao tác hơn.
- Nếu không có CSS thì giao diện chỉ là chữ và ảnh thô, rất khó dùng và khó demo.
- Nói ngắn: CSS là phần làm web từ “có chức năng” thành “có hình có dạng”.

## Câu 32. Vì sao em chọn Tailwind thay vì CSS thuần?
- Tailwind giúp em viết style ngay trong component nên nhanh hơn và ít phải chuyển qua lại giữa nhiều file.
- Em chọn Tailwind vì dự án có nhiều màn hình: đăng nhập, upload, kết quả, lịch sử, dashboard.
- Với Tailwind, em dễ đồng bộ màu sắc, khoảng cách và responsive trên toàn bộ hệ thống.
- Nó cũng hợp với việc làm prototype nhanh để kịp tiến độ đồ án.
- Nói ngắn: Tailwind giúp em làm UI nhanh, gọn và nhất quán hơn.

## Câu 33. Responsive design là gì?
- Responsive design là cách thiết kế giao diện tự co giãn theo kích thước màn hình.
- Em dùng responsive để web vẫn dễ dùng trên điện thoại, laptop và màn hình lớn.
- Trong dự án của em, đây là điểm quan trọng vì người dùng có thể chụp ảnh bằng điện thoại rồi upload ngay.
- Nếu không responsive, phần card kết quả hoặc form upload sẽ bị vỡ layout trên mobile.
- Nói ngắn: responsive là làm giao diện tự thích nghi với nhiều màn hình.

## Câu 34. Flexbox và Grid dùng thế nào?
- Flexbox hợp cho bố cục một chiều, ví dụ hàng nút bấm, thanh trên cùng hoặc card theo hàng.
- Grid hợp cho bố cục hai chiều, ví dụ chia nhiều khối nội dung đều nhau trên một trang.
- Trong dự án của em, em dùng flex cho các vùng thao tác nhanh và grid cho khu vực danh sách hoặc lịch sử.
- Hai công cụ này giúp layout sạch hơn và kiểm soát khoảng cách tốt hơn.
- Nói ngắn: flex là xếp hàng theo một chiều, grid là chia ô theo nhiều chiều.

## Câu 35. Component tái sử dụng là gì?
- Component tái sử dụng là component viết một lần nhưng có thể dùng lại nhiều nơi.
- Em rất cần kiểu này cho button, card, modal, badge và input.
- Trong dự án của em, một button đẹp chuẩn hóa sẽ được dùng ở trang đăng nhập, trang upload và trang kết quả.
- Cách này giúp giao diện đồng nhất và dễ sửa hàng loạt nếu đổi thiết kế.
- Nói ngắn: viết một lần, dùng nhiều lần.

## Câu 36. Loading state và empty state là gì?
- Loading state là trạng thái đang chờ dữ liệu, còn empty state là khi chưa có dữ liệu để hiển thị.
- Em dùng loading state khi đang upload ảnh hoặc đang chờ AI trả kết quả.
- Em dùng empty state ở lịch sử chẩn đoán khi người dùng chưa có lần đoán nào.
- Hai trạng thái này giúp giao diện đỡ “trống” và người dùng hiểu hệ thống đang làm gì.
- Nói ngắn: loading là đang chờ, empty là chưa có gì để hiện.

## Câu 37. Error state là gì?
- Error state là giao diện báo lỗi rõ ràng cho người dùng khi thao tác thất bại.
- Em dùng error state khi ảnh không hợp lệ, request bị lỗi mạng hoặc backend trả lỗi.
- Trong dự án của em, error state rất quan trọng vì ảnh lá cây có thể mờ, không rõ hoặc không đúng định dạng.
- Nếu không có error state, người dùng chỉ thấy màn hình đứng im mà không biết lỗi ở đâu.
- Nói ngắn: error state là cách báo lỗi thân thiện thay vì để người dùng tự đoán.

## Câu 38. Design system là gì?
- Design system là bộ quy tắc thống nhất cho UI như màu sắc, font, spacing, button, card và trạng thái.
- Em dùng design system để giao diện toàn dự án nhìn cùng một phong cách.
- Trong dự án của em, điều này rất hữu ích vì trang kết quả, lịch sử và auth phải cùng một cảm giác, không bị mỗi trang một kiểu.
- Design system cũng giúp sửa giao diện nhanh nếu giảng viên góp ý một điểm nào đó.
- Nói ngắn: design system là bộ luật để UI không bị lộn xộn.

## Câu 39. Accessibility là gì?
- Accessibility là thiết kế để nhiều người có thể dùng web hơn, kể cả người dùng cần chữ rõ, nút lớn, hoặc tương tác dễ hơn.
- Em chú ý accessibility vì giao diện phải rõ ràng, dễ đọc và dễ bấm khi demo trên nhiều thiết bị.
- Trong dự án của em, các button, label, thông báo lỗi và modal đều nên dễ hiểu ngay.
- Làm tốt accessibility cũng giúp giao diện chuyên nghiệp hơn.
- Nói ngắn: accessibility là làm web dễ dùng cho nhiều người hơn.

## Câu 40. Vì sao giao diện của dự án cần rõ ràng và tối giản?
- Vì người dùng chỉ cần đi qua một luồng chính: đăng nhập, upload, nhận kết quả, xem lịch sử.
- Em chọn giao diện rõ ràng để người dùng không bị phân tâm bởi quá nhiều chi tiết không cần thiết.
- Với một ứng dụng AI, điều quan trọng là người dùng hiểu ngay mình phải làm gì tiếp theo.
- Trong đồ án nhận diện bệnh lá cây, giao diện tối giản còn giúp giảng viên xem demo nhanh và dễ theo dõi logic.
- Nói ngắn: giao diện càng rõ thì demo càng mạch lạc và dễ chấm.

## Câu chốt ngắn để nhớ nhóm CSS & UI
- CSS tạo kiểu, Tailwind giúp viết nhanh hơn.
- Responsive giúp web chạy tốt trên nhiều màn hình.
- Loading, empty và error state làm giao diện dễ hiểu hơn.
- Design system giúp toàn dự án nhất quán và dễ bảo trì.

# Đáp Án Vấn Đáp - Nhóm 1.6: Backend, Docker và Deploy

> Nhóm này em nên trả lời theo kiểu rất thực tế: dự án không chỉ chạy được trên máy mình mà còn phải chạy ổn trên VPS và có domain, SSL, reverse proxy.

## Câu 41. Backend trong dự án của em làm nhiệm vụ gì?
- Backend là phần xử lý logic phía server, không phải giao diện.
- Trong dự án của em, backend AI FastAPI nhận ảnh, tiền xử lý, chạy model và trả kết quả nhận diện cây và bệnh.
- Nó cũng là nơi phù hợp để chuẩn hóa response, kiểm tra ảnh hợp lệ và xử lý lỗi kỹ thuật.
- Em không để frontend làm các việc nặng này vì frontend chỉ nên lo giao diện và điều phối.
- Nói ngắn: backend là nơi làm việc nặng và trả kết quả sạch cho frontend.

## Câu 42. Vì sao em dùng FastAPI cho microservice AI?
- FastAPI nhẹ, nhanh, dễ viết API và rất hợp cho các service machine learning.
- Em chọn FastAPI vì nó dễ tạo endpoint cho dự đoán, health check và các luồng hỗ trợ khác.
- Trong dự án nhận diện bệnh lá cây, FastAPI là lớp AI độc lập, tách khỏi Next.js để dễ bảo trì và mở rộng.
- FastAPI cũng hợp với Python, nên gắn với PyTorch và OpenCV rất tự nhiên.
- Nói ngắn: FastAPI là lựa chọn tốt khi mình cần một API AI gọn và hiệu quả.

## Câu 43. Microservice là gì, và vì sao em tách AI thành microservice riêng?
- Microservice là cách chia hệ thống thành các dịch vụ nhỏ, mỗi dịch vụ làm một nhiệm vụ rõ ràng.
- Em tách AI thành microservice riêng để frontend không bị dính trực tiếp vào model và thư viện nặng.
- Trong dự án của em, Next.js lo UI, Supabase lo auth và data, còn FastAPI chỉ lo suy luận AI.
- Cách tách này giúp dễ deploy, dễ thay model và dễ debug hơn.
- Nói ngắn: tách microservice để mỗi phần làm đúng việc của nó.

## Câu 44. Vì sao dự án cần Docker?
- Docker giúp đóng gói ứng dụng và toàn bộ dependency vào một môi trường chạy thống nhất.
- Em cần Docker vì dự án có nhiều phần: frontend Next.js, backend FastAPI, database ngoài, reverse proxy và biến môi trường.
- Nhờ Docker, em có thể chạy lại đúng môi trường ở máy khác hoặc VPS khác mà ít bị lỗi “máy em chạy được”.
- Trong đồ án nhận diện bệnh lá cây, Docker giúp demo ổn định hơn và dễ triển khai hơn.
- Nói ngắn: Docker làm cho việc chạy dự án đồng nhất và đỡ phụ thuộc máy cài thủ công.

## Câu 45. Dockerfile là gì?
- Dockerfile là file mô tả cách build ra một image Docker.
- Nó nói rõ cần base image nào, copy code gì, cài package gì và chạy lệnh nào khi container khởi động.
- Trong dự án của em, em có Dockerfile riêng cho backend FastAPI và cho frontend Next.js.
- Cách này giúp tách môi trường từng phần rõ ràng và build được production image sạch hơn.
- Ví dụ cực ngắn:

```dockerfile
FROM python:3.11-slim
COPY requirements.txt .
```

## Câu 46. Docker Compose dùng để làm gì?
- Docker Compose dùng để chạy nhiều container cùng lúc bằng một file cấu hình chung.
- Em dùng Compose để ghép frontend, backend và Nginx vào cùng một stack.
- Trong dự án của em, Compose giúp cấu hình mạng nội bộ, biến môi trường và volume rõ ràng hơn.
- Nó rất hợp cho môi trường demo hoặc VPS vì chỉ cần một lệnh là khởi động được cả hệ thống.
- Nói ngắn: Compose là cách ghép nhiều dịch vụ Docker thành một bộ chạy hoàn chỉnh.

## Câu 47. Nginx dùng để làm gì trong dự án của em?
- Nginx là reverse proxy, tức là đứng trước các service khác để nhận request và chuyển đúng nơi.
- Em dùng Nginx để gộp frontend và backend dưới cùng một domain, đồng thời xử lý HTTPS.
- Trong dự án của em, Nginx còn giúp route `/api` sang FastAPI và route còn lại sang Next.js.
- Cách này làm kiến trúc production rõ ràng và dễ trình bày khi vấn đáp.
- Nói ngắn: Nginx là cổng vào chính của hệ thống khi deploy thật.

## Câu 48. Reverse proxy là gì?
- Reverse proxy là một server trung gian đứng trước các dịch vụ thật và thay mặt chúng nhận request.
- Em dùng reverse proxy để che bớt cấu trúc nội bộ, dễ thêm SSL và dễ định tuyến request.
- Trong dự án của em, Nginx là reverse proxy nối người dùng với frontend và backend AI.
- Nhờ vậy, người dùng chỉ thấy một domain, còn phía sau thì hệ thống tách thành nhiều service.
- Nói ngắn: reverse proxy là lớp đứng ngoài để điều phối request vào đúng service.

## Câu 49. Cloudflare/SSL có vai trò gì trong deploy?
- SSL giúp mã hóa dữ liệu giữa trình duyệt và server, làm kết nối an toàn hơn.
- Em dùng SSL để người dùng đăng nhập, upload ảnh và gửi request mà không bị gửi dưới dạng plain text.
- Với Cloudflare hoặc Let’s Encrypt, em có thể bật HTTPS cho domain của đồ án trên VPS.
- Điều này quan trọng vì project có đăng nhập và dữ liệu người dùng, nên không thể chạy trần HTTP.
- Nói ngắn: SSL là lớp bảo mật cho kết nối web.

## Câu 50. Vì sao phải deploy trên VPS chứ không chỉ chạy local?
- Chạy local chỉ chứng minh code hoạt động trên máy cá nhân, chưa phải môi trường thật.
- Em deploy lên VPS để demo qua domain thật, có HTTPS, có reverse proxy và có đường dẫn ổn định.
- Với đồ án của em, deploy trên VPS giúp giảng viên thấy hệ thống chạy end-to-end giống sản phẩm thật.
- Nó cũng cho em kiểm tra lỗi môi trường, biến môi trường và khả năng restart service.
- Nói ngắn: VPS là bước chứng minh hệ thống có thể dùng thật, không chỉ chạy thử.

## Câu chốt ngắn để nhớ nhóm Backend & Deploy
- FastAPI là microservice AI.
- Docker giúp đóng gói và chạy đồng nhất.
- Compose ghép nhiều service lại.
- Nginx là reverse proxy và SSL là lớp bảo mật cho deploy thật.

# Đáp Án Vấn Đáp - Nhóm 1.7: AI, Bảo mật, Test và Retraining

> Đây là nhóm rất quan trọng vì nó chạm thẳng vào lõi đồ án của em: nhận diện bệnh lá cây, lưu lịch sử, phản hồi người dùng và chuẩn bị dữ liệu cải tiến mô hình.

## Câu 51. Vì sao dự án của em dùng AI hai bước: nhận diện cây trước, rồi mới nhận diện bệnh?
- Vì mỗi loại cây có tập bệnh khác nhau, nên xác định đúng cây trước sẽ giúp thu hẹp không gian dự đoán bệnh.
- Em dùng pipeline hai bước để tăng độ chính xác và làm kết quả dễ giải thích hơn.
- Trong dự án của em, bước 1 đoán loại cây, bước 2 mới chọn model hoặc nhãn bệnh phù hợp với cây đó.
- Cách này cũng giúp tránh nhầm lẫn giữa các bệnh có triệu chứng gần giống nhau ở nhiều loại cây.
- Nói ngắn: đoán đúng cây trước rồi mới đoán bệnh sẽ ổn định và thực tế hơn.

## Câu 52. Vì sao em chọn MobileNetV3?
- MobileNetV3 là model gọn, nhẹ và phù hợp cho bài toán phân loại ảnh khi cần chạy nhanh.
- Em chọn nó vì đồ án cần cân bằng giữa độ chính xác và tốc độ suy luận.
- Trong dự án của em, mô hình phải chạy được trên máy demo hoặc VPS mà không cần cấu hình quá mạnh.
- Đây là lựa chọn hợp lý cho một hệ thống cần AI nhưng vẫn phải dễ triển khai.
- Nói ngắn: MobileNetV3 nhẹ, đủ tốt và phù hợp demo thực tế.

## Câu 53. OpenCV dùng để làm gì trong pipeline AI?
- OpenCV dùng để đọc, xử lý và tiền xử lý ảnh trước khi đưa vào model.
- Em dùng nó để chuẩn hóa ảnh, cắt vùng lá nếu cần, hoặc xử lý các bước chuẩn bị đầu vào.
- Trong đồ án của em, OpenCV giúp giảm nhiễu đầu vào và làm dữ liệu ảnh đồng nhất hơn cho model.
- Nhờ tiền xử lý tốt thì model dễ dự đoán ổn định hơn.
- Nói ngắn: OpenCV là bước chuẩn bị ảnh trước khi AI nhìn thấy ảnh đó.

## Câu 54. Khi nào em sẽ nói là ảnh không phù hợp để nhận diện?
- Khi ảnh quá mờ, quá tối, không thấy rõ lá, hoặc có quá nhiều vật thể gây nhiễu.
- Em sẽ báo cho người dùng thay ảnh khác thay vì cố đoán một kết quả không đáng tin.
- Trong dự án của em, nếu ảnh nhiều lá hoặc lá quá nhỏ thì độ tin cậy có thể giảm.
- Cách này giúp tránh hiển thị kết quả sai nhưng nghe có vẻ chắc chắn.
- Nói ngắn: ảnh không rõ thì nên từ chối hoặc cảnh báo, không nên cố đoán bừa.

## Câu 55. Confidence score là gì?
- Confidence score là mức độ tin cậy của model đối với kết quả dự đoán.
- Em dùng confidence để biết khi nào kết quả đủ tin cậy và khi nào cần cảnh báo người dùng.
- Trong dự án của em, confidence thấp có thể dẫn tới thông báo rằng ảnh chưa đủ rõ hoặc cần chụp lại.
- Nó giúp hệ thống trung thực hơn thay vì lúc nào cũng trả lời như thể mình chắc chắn tuyệt đối.
- Nói ngắn: confidence là độ tin của model với dự đoán của chính nó.

## Câu 56. Feedback của người dùng được dùng để làm gì?
- Feedback giúp em biết dự đoán nào đúng, dự đoán nào sai hoặc phần khuyến nghị nào chưa phù hợp.
- Em lưu feedback vào database để có thể xuất ra dữ liệu phục vụ retraining sau này.
- Trong dự án của em, feedback là cầu nối giữa demo hiện tại và việc cải thiện mô hình về sau.
- Nhờ feedback, hệ thống không chỉ dừng ở chẩn đoán mà còn có vòng lặp cải tiến.
- Nói ngắn: feedback là dữ liệu để sau này cải thiện AI.

## Câu 57. Retraining là gì?
- Retraining là huấn luyện lại mô hình bằng dữ liệu mới hoặc dữ liệu đã được làm sạch hơn.
- Em dùng retraining khi muốn cải thiện độ chính xác sau khi có thêm feedback từ người dùng thực tế.
- Trong dự án của em, lịch sử chẩn đoán và feedback có thể được export ra để tạo bộ dữ liệu cho lần train tiếp theo.
- Cách này giúp hệ thống tiến hóa dần thay vì cố định một model từ đầu tới cuối.
- Nói ngắn: retraining là huấn luyện lại để model tốt hơn theo dữ liệu mới.

## Câu 58. Vì sao em cần lưu lịch sử chẩn đoán?
- Vì lịch sử giúp user xem lại các lần đã đoán và giúp hệ thống có dữ liệu để audit hoặc cải tiến.
- Em lưu lịch sử để người dùng biết trước đây đã upload ảnh nào, kết quả gì và khuyến nghị ra sao.
- Trong dự án nhận diện bệnh lá cây, lịch sử còn phục vụ phần phản hồi và retraining.
- Nó biến ứng dụng từ demo đơn lẻ thành một hệ thống có dữ liệu tích lũy theo thời gian.
- Nói ngắn: lịch sử vừa hữu ích cho người dùng, vừa hữu ích cho việc cải tiến hệ thống.

## Câu 59. Kiểm thử của dự án em tập trung vào những gì?
- Em kiểm thử các luồng chính: đăng nhập, upload ảnh, nhận kết quả, xem lịch sử và gửi feedback.
- Em cũng phải test ảnh lỗi như file không phải ảnh, ảnh quá lớn, hoặc ảnh không rõ lá.
- Trong dự án của em, kiểm thử còn gồm xác nhận RLS, xem dữ liệu đúng user và kiểm tra retraining export.
- Mục tiêu là đảm bảo luồng end-to-end chạy ổn trước khi demo.
- Nói ngắn: test của em tập trung vào cả chức năng lẫn dữ liệu và bảo mật.

## Câu 60. Nếu giảng viên hỏi “em học được gì từ đồ án này?”, em trả lời sao?
- Em học được cách thiết kế một hệ thống hoàn chỉnh từ UI, dữ liệu, AI đến deploy.
- Em cũng học được cách tách trách nhiệm rõ: Next.js lo giao diện, Supabase lo auth và data, FastAPI lo AI, Docker lo deploy.
- Quan trọng hơn, em học được cách nghĩ theo luồng thật của người dùng chứ không chỉ viết từng tính năng rời rạc.
- Đồ án này giúp em hiểu rằng làm phần mềm tốt không chỉ là code chạy, mà còn phải dễ bảo trì, dễ demo và dễ mở rộng.
- Nói ngắn: em học được cách xây một sản phẩm có kiến trúc rõ ràng thay vì chỉ làm một demo đơn lẻ.

## Câu chốt ngắn để nhớ nhóm AI, test và retraining
- Hai bước AI giúp tăng độ chính xác và dễ giải thích hơn.
- MobileNetV3 và OpenCV phù hợp vì nhẹ và dễ triển khai.
- Confidence, feedback và history là nền tảng cho retraining.
- Test và bảo mật giúp hệ thống đủ tin cậy để demo và bảo vệ dữ liệu người dùng.
