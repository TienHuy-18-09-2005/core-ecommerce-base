# Yêu cầu dành cho AI: chỉnh sửa `frontend_plan.md`

> Sao chép nội dung tài liệu này hoặc cung cấp cả file này và `frontend_plan.md` cho AI thực hiện. Mục tiêu là để AI **đọc codebase, rồi chỉnh trực tiếp `frontend_plan.md`** theo các yêu cầu dưới đây.

## Nhiệm vụ

Bạn là AI hỗ trợ lập kế hoạch kỹ thuật. Hãy kiểm tra kế hoạch frontend hiện có cùng mã nguồn liên quan trong repository, sau đó cập nhật trực tiếp `frontend_plan.md` để kế hoạch:

- Phản ánh chính xác trạng thái hiện tại của frontend và backend.
- Có thứ tự triển khai, phạm vi MVP và phụ thuộc frontend/backend rõ ràng.
- Không xem tính năng/API chưa triển khai là đã sẵn sàng.
- Có tiêu chí hoàn thành và kiểm thử cụ thể cho từng mốc.

**Chỉ cập nhật tài liệu kế hoạch. Không sửa mã nguồn ứng dụng, không tự triển khai tính năng, không tạo thêm tài liệu khác.** Giữ lại nội dung hữu ích trong kế hoạch gốc; chỉnh hoặc bỏ phần sai, trùng lặp, mâu thuẫn. Giữ ngôn ngữ tiếng Việt và cấu trúc dễ đọc.

## Phạm vi cần kiểm tra

Đọc `frontend_plan.md` và kiểm tra tối thiểu các nguồn liên quan sau trước khi sửa:

- Frontend: `frontend/src/App.tsx`, `frontend/src/pages/shop/ProductDetail.tsx`, `frontend/src/services/productService.ts`, `frontend/src/services/cartService.ts`, `frontend/src/types/product.ts`, `frontend/package.json`.
- Backend: `backend/routes/api.php`, các controller được routes sử dụng, request validation và DTO liên quan đến catalog/cart/checkout.
- Nếu một tuyên bố trong kế hoạch không thể xác minh từ các file đã đọc, đừng khẳng định nó là sự thật; ghi rõ là cần xác minh.

## Các nội dung bắt buộc phải chỉnh

| Ưu tiên | Nội dung cần điều chỉnh |
|---|---|
| P0 | **Mô tả hiện trạng:** Kế hoạch hiện ghi cart service có CRUD/session và ProductDetail hoàn thiện cơ bản. Hãy đối chiếu code và mô tả đúng phần đã có, phần còn lỗi/thiếu, không đánh đồng “có file” với “đã hoàn thiện”. Ví dụ cần xác minh: hàm sinh session trong `cartService.ts` có lỗi `36.substring(2)`; nút thêm giỏ trong `ProductDetail.tsx` chưa gọi service. |
| P0 | **MVP và backend:** Các API phục vụ MVP phải được phân loại rõ thành có sẵn, cần sửa, hoặc cần xây mới. Không gọi Pha 0–3 là MVP chạy được nếu còn endpoint/cấu hình bắt buộc chưa có. Ghi backend work là dependency và phân biệt effort backend với frontend. |
| P0 | **Sanctum/API client:** Pha 0 đề cập token/refresh interceptor nhưng Pha 4 để ngỏ cookie SPA hoặc token. Loại bỏ mâu thuẫn bằng cách yêu cầu nhóm dự án xác nhận mô hình trước khi thực hiện. Không tự khẳng định có refresh token nếu backend chưa cung cấp. Liệt kê các nội dung cần xác nhận: CSRF, cookie/credentials hoặc token, CORS và khôi phục phiên. |
| P0 | **Checkout/thanh toán:** Wireframe có phí ship, coupon và nhiều phương thức. Đối chiếu request validation và API hiện hữu; ghi phương thức được hỗ trợ và phần còn phụ thuộc backend. Nếu nghiệp vụ chưa được quyết định, đưa thành câu hỏi/quyết định cần chốt, không tự chọn thay người dùng. Nêu rõ server là nguồn xác nhận giá, giảm giá, tồn kho và tổng tiền. |
| P1 | **Hợp đồng API:** Với API cần bổ sung, ghi rõ endpoint, method, mục đích, pha phụ thuộc và trạng thái (đã có/cần sửa/cần xây mới). Nêu rõ request/response, phân trang, lỗi và phân quyền khi thông tin đã xác minh; không bịa schema hoặc người phụ trách. |
| P1 | **Catalog/filter:** So sánh filter, sort và pagination dự kiến với backend thật. Ví dụ `GetProductsDTO` nhận `category_id`, `brand_id`, `search`, `min_price`, `max_price`, `sort_by`, `per_page`; không mặc định rating filter hoặc các kiểu sort khác hoạt động nếu chưa xác minh. Đánh dấu tính năng cần backend nếu chưa được hỗ trợ. |
| P1 | **Routing:** Frontend hiện có `/products/:slug`, kế hoạch đề xuất `/san-pham/:slug`. Nêu quyết định cần chốt về URL chuẩn và phương án tương thích/redirect; thêm route 404 và kiểm thử URL sâu/refresh nếu phù hợp. Không âm thầm giả định đổi URL không ảnh hưởng liên kết cũ. |
| P1 | **Auth/tài khoản và admin:** Đánh dấu API chưa có là phụ thuộc backend. Với admin, nêu rõ kiểm soát quyền phải được thực hiện ở server; route guard phía frontend không thay thế authorization. Không mô tả CRUD/upload/report là sẵn sàng khi chưa có API tương ứng. |
| P1 | **Tiêu chí nghiệm thu:** Thêm tiêu chí có thể kiểm tra cho từng pha/vertical slice, bao gồm thành công, loading, error, empty, validation, tồn kho, mobile và tích hợp API phù hợp với phạm vi. |
| P2 | **Timeline:** Giữ con số cũ chỉ khi có giả định và cơ sở phù hợp; nếu chưa đủ dữ liệu, ghi là ước lượng sơ bộ cần cập nhật sau khi chốt phạm vi/API. Phân biệt frontend, backend và tích hợp; nêu giả định về nhân lực, làm song song, thanh toán và kiểm thử. |
| P2 | **Polish:** Tách các mục như PWA, dark mode, animation và SEO nâng cao khỏi MVP, trừ khi yêu cầu sản phẩm xác định chúng là bắt buộc. |

## Trình tự triển khai cần thể hiện trong kế hoạch đã chỉnh

1. **Xác minh hiện trạng và chốt hợp đồng:** kiểm tra routes, validation, response, auth; phân loại API; ghi các quyết định còn mở về URL, checkout, phí ship/coupon, thanh toán và Sanctum.
2. **Sửa/hoàn thiện nền hiện có:** ưu tiên session giỏ khách, handler thêm giỏ, lỗi tải sản phẩm và API client theo mô hình đã được xác nhận.
3. **MVP theo vertical slice:** catalog/chi tiết → giỏ khách → checkout trong phạm vi đã chốt → xác nhận đơn; chỉ đưa các endpoint sẵn có hoặc có đầu việc backend rõ ràng vào mốc.
4. **Auth/tài khoản:** triển khai sau khi API và chính sách merge/giữ giỏ được xác nhận.
5. **Review và admin:** triển khai sau khi có API, quy tắc nghiệp vụ, upload và phân quyền tương ứng.
6. **Ổn định và phát hành:** responsive, accessibility cơ bản, xử lý lỗi, hiệu năng và kiểm thử URL/triển khai; xếp PWA, dark mode, animation vào phần sau nếu chưa bắt buộc.

Không bắt buộc phải giữ nguyên tên hoặc số thứ tự pha hiện tại nếu chúng gây nhầm lẫn; nếu thay đổi, cập nhật đồng bộ routing, timeline và phần tổng kết.

## Nguyên tắc khi AI đưa ra bản chỉnh sửa

- Đưa ra thay đổi trực tiếp trong `frontend_plan.md`, không chỉ trả về nhận xét.
- Không sửa code hoặc file khác.
- Không tự quyết định các câu hỏi nghiệp vụ chưa có đáp án; lập mục “Cần xác nhận” với câu hỏi cụ thể và tác động nếu để ngỏ.
- Gắn nhãn các giả định và thông tin chưa xác minh; không trình bày chúng như sự thật.
- Bảo toàn những phần trong kế hoạch gốc còn đúng và có giá trị.
- Kết thúc bằng tóm tắt các phần đã sửa, các quyết định còn cần người dùng/backend xác nhận và những điều chưa thể xác minh.

## 2. Trình tự kế hoạch đề xuất sau khi chỉnh sửa

### Bước 0 — Xác minh hiện trạng và chốt hợp đồng

**Công việc**

- Rà soát routes, request validation, response shape và trạng thái auth của backend.
- Phân loại từng API: đã có và dùng được; đã có nhưng cần chỉnh; chưa có.
- Chốt URL sản phẩm, schema lỗi/API response, pagination, các filter/sort được hỗ trợ.
- Chốt phạm vi checkout đầu tiên: guest hay bắt buộc tài khoản, phương thức thanh toán, coupon và phí giao hàng.
- Chọn một cách dùng Sanctum; xác nhận cấu hình CORS, CSRF, cookie/credentials hoặc token.

**Tiêu chí hoàn thành**

- Có danh sách API được backend và frontend cùng xác nhận, bao gồm ví dụ request/response và lỗi thường gặp.
- Mọi tính năng trong MVP đều gắn với API sẵn có hoặc đầu việc backend có người phụ trách và mốc dự kiến.
- Không còn lựa chọn chưa quyết định nào chặn thiết kế API client hoặc checkout.

### Bước 1 — Sửa nền móng hiện có

**Công việc**

- Sửa cách sinh session ID giỏ khách và kiểm tra trường hợp localStorage chưa có session.
- Kiểm tra session ID được gửi nhất quán cho đọc/thêm/sửa/xóa giỏ và checkout.
- Hoàn thiện nút thêm giỏ tại trang chi tiết: yêu cầu biến thể hợp lệ, kiểm tra số lượng với tồn kho, gọi API và hiển thị kết quả rõ ràng.
- Xử lý loading/error khi đổi slug hoặc API lỗi; tránh hiển thị dữ liệu cũ như thể thuộc sản phẩm mới.
- Tạo API client theo mô hình auth đã chốt; chuẩn hóa lỗi nhưng không che lỗi server.

**Tiêu chí hoàn thành**

- Người dùng mới có thể mở trang sản phẩm và thêm mặt hàng vào giỏ mà không gặp lỗi khởi tạo session.
- Thao tác hết hàng, số lượng vượt kho, API lỗi và tải lại trang có phản hồi đúng.
- Có kiểm thử cho sinh session và luồng thêm sản phẩm vào giỏ.

### Bước 2 — Hoàn thiện vertical slice MVP

**Phạm vi**

1. Trang danh sách và chi tiết sản phẩm.
2. Tìm kiếm, lọc, sắp xếp và phân trang đúng theo API đã chốt.
3. Giỏ hàng khách; cập nhật số lượng và xóa mặt hàng.
4. Checkout theo phạm vi thanh toán đã quyết định.
5. Trang xác nhận đơn hàng sử dụng response từ server.

**Tiêu chí hoàn thành**

- Luồng từ duyệt sản phẩm đến đặt đơn chạy end-to-end trên môi trường tích hợp.
- Checkout xử lý giỏ rỗng, dữ liệu giao hàng không hợp lệ, coupon không hợp lệ (nếu có), hết hàng và lỗi tạo đơn.
- Giá/tổng tiền hiển thị khớp dữ liệu server; frontend không tự quyết định giá hoặc trạng thái thanh toán.
- Các trang hỗ trợ mobile, loading, error và empty state; URL có thể tải trực tiếp và refresh.

### Bước 3 — Bổ sung auth và tài khoản

Chỉ bắt đầu sau khi login/register/profile/đơn hàng có API và hợp đồng rõ ràng. Xác định chính sách giỏ khi đăng nhập: giữ giỏ khách, hợp nhất hay ưu tiên giỏ tài khoản; xử lý xung đột số lượng theo quy tắc backend.

**Tiêu chí hoàn thành**

- Phiên đăng nhập được khôi phục và đăng xuất đúng theo mô hình Sanctum đã chọn.
- Route yêu cầu đăng nhập có chuyển hướng phù hợp; lỗi 401/403 được xử lý rõ.
- Nếu bật merge cart, kiểm thử được trường hợp trùng biến thể và số lượng vượt tồn kho.

### Bước 4 — Đánh giá và admin

- Chỉ triển khai review sau khi chốt quyền tạo đánh giá, kiểm duyệt, phân trang và upload ảnh.
- Chỉ triển khai admin sau khi backend có CRUD đầy đủ và kiểm tra quyền ở server.
- Coi dashboard, upload media và phân quyền là scope riêng; không gộp mặc định vào estimate CRUD cơ bản.

### Bước 5 — Hoàn thiện trải nghiệm và phát hành

- Ưu tiên responsive, accessibility cơ bản, SEO cần thiết, Error Boundary và hiệu năng đo được.
- Thực hiện lazy loading, animation, dark mode và PWA theo nhu cầu đã xác nhận, không coi là điều kiện MVP mặc định.
- Kiểm tra build, lint, luồng chính, cấu hình production, SPA fallback và các URL sâu.

## 3. Điều chỉnh thứ tự ưu tiên và phạm vi MVP

**MVP đề xuất:** sản phẩm → giỏ khách → checkout với phương thức đã xác nhận → xác nhận đơn.

Các mục sau không mặc định nằm trong MVP: auth/tài khoản, merge cart, review, admin, thanh toán online, PWA và dark mode. Nếu nghiệp vụ yêu cầu một mục trong số này cho ngày phát hành đầu, cần đưa API/backend liên quan và kiểm thử vào phạm vi, timeline trước khi chốt.

Pha nền tảng chỉ nên tạo các tiện ích cần cho vertical slice đầu tiên. Những component dùng chung chưa cần thiết có thể bổ sung khi có trang thực tế để tránh xây quá nhiều trước khi kiểm chứng giao diện.

## 4. Cách cập nhật timeline

Không cộng effort backend vào con số frontend hiện tại hoặc giả định backend đã sẵn sàng. Hãy lập estimate riêng theo ba nhóm:

| Nhóm | Nội dung cần ước lượng |
|---|---|
| Frontend | Sửa mã hiện có, pages/components, trạng thái UX, responsive và kiểm thử. |
| Backend/API | API mới/chỉnh sửa, validation, phân quyền, tính giá/ship/coupon, thanh toán và dữ liệu mẫu. |
| Tích hợp/phát hành | Cấu hình môi trường, CORS/CSRF, kiểm thử end-to-end, xử lý lỗi liên hệ thống và triển khai. |

Sau Bước 0, cập nhật số ngày theo người thực hiện, mức song song giữa frontend/backend và phạm vi thanh toán. Thay timeline tích lũy cũ bằng các mốc có điều kiện đầu vào và tiêu chí hoàn thành; chỉ cam kết ngày phát hành khi các phụ thuộc backend của mốc đó đã được xác nhận.

## 5. Danh sách cập nhật cần áp dụng vào `frontend_plan.md`

1. Sửa bảng “Frontend hiện tại” để phân biệt phần đã có mã với phần đã hoàn thiện và kiểm thử.
2. Thêm Bước 0 “Xác minh hiện trạng và chốt hợp đồng API” trước Pha 0.
3. Sửa thứ tự MVP theo vertical slice và nêu rõ phạm vi checkout.
4. Gắn từng API còn thiếu với pha, owner (frontend/backend), dependency và response contract.
5. Sửa mô tả auth, interceptor và Sanctum nhất quán theo lựa chọn đã chốt.
6. Sửa các yêu cầu filter/sort/pagination theo khả năng API đã xác minh.
7. Bổ sung xử lý URL cũ/mới, 404, refresh route và môi trường triển khai.
8. Tách scope admin/review/thanh toán online khỏi MVP trừ khi có quyết định rõ.
9. Thêm tiêu chí nghiệm thu và kiểm thử cho mỗi pha.
10. Tính lại timeline theo effort frontend, backend và tích hợp riêng; ghi rõ giả định.

## 6. Điều kiện để coi kế hoạch đã được sửa xong

- Không mô tả chức năng chưa có handler/API là đã hoàn thiện.
- Không có tính năng MVP nào phụ thuộc API chưa có mà không được ghi nhận là blocker/dependency.
- Mô hình auth, URL chuẩn và phạm vi thanh toán không còn mâu thuẫn giữa các mục.
- Mỗi pha có đầu vào, đầu ra, tiêu chí nghiệm thu và kiểm thử tối thiểu.
- Tổng thời gian có giả định và phân biệt rõ phần frontend với backend/tích hợp.
