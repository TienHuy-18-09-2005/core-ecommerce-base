# 🎨 KẾ HOẠCH THIẾT KẾ LẠI GIAO DIỆN TRANG QUẢN TRỊ — Core E-commerce (Thiết Bị Điện)

> Vai trò soạn: BA + UI/UX/Frontend. Nhánh: `Luke`. Ngày: 26/10/2026.
> Phạm vi: `frontend/src/pages/admin/**`, `frontend/src/components/admin/**` và các API `/api/admin/*` cần bổ sung.
> Kế hoạch này tiếp nối Pha 6 và mục 5 (Nguyên tắc UI/UX) của `frontend_plan.md`: giữ palette Blue 600 / Amber 500, toast, skeleton, breadcrumb, a11y (focus trap, ESC).

---

## 1. Mục tiêu & chỉ số thành công

| Mục tiêu | Chỉ số đo | Mục tiêu đạt |
|---|---|---|
| Admin vào trang quản trị không cần gõ URL | Có lối vào từ header shop + tự chuyển hướng sau đăng nhập | 100% admin |
| Xử lý đơn nhanh hơn | Số click từ Tổng quan → xác nhận 1 đơn chờ | ≤ 3 click (hiện ~5) |
| Xử lý hàng loạt | Xác nhận/đổi trạng thái N đơn cùng lúc | Có bulk action |
| Soạn sản phẩm dễ | Mô tả dùng trình soạn thảo rich text, không HTML thô | 100% |
| Tìm nhanh | Tìm kiếm toàn cục (Ctrl+K) đơn/sản phẩm/khách | < 300 ms hiển thị gợi ý |
| Nhất quán | 0 chuỗi tiếng Anh, chính tả thống nhất ("Xóa") | 0 lỗi khi rà soát |
| Hiệu năng | Chunk admin tải lười, LCP trang admin | < 2,5 s, chunk route < 80 KB gzip |
| Truy cập | Lighthouse Accessibility trang admin | ≥ 95 |

## 2. Persona & việc cần làm (JTBD)

| Persona | Mô tả | Việc chính |
|---|---|---|
| **Chủ shop (admin)** | Quyết định giá, khuyến mãi, xem doanh thu | Xem KPI hằng ngày, tạo mã giảm giá, theo dõi hàng sắp hết |
| **Nhân viên xử lý đơn** | Dùng nhiều nhất, thao tác lặp | Lọc đơn chờ, xác nhận, đóng gói, giao, huỷ có lý do, ghi chú nội bộ |
| **Nhân viên nội dung/kho** | Quản lý catalog | Thêm/sửa sản phẩm, biến thể, ảnh, thông số kỹ thuật, tồn kho, danh mục, thương hiệu |
| **Kiểm duyệt** | Chăm sóc uy tín | Ẩn/hiện/xoá đánh giá, xem ảnh đánh giá |

> Hiện hệ thống chỉ có 1 vai trò `admin` (Gate `admin` = role admin + is_active). Phân quyền chi tiết (staff/editor) là **câu hỏi mở** (mục 12).

JTBD ưu tiên: (1) "Khi có đơn mới, tôi muốn thấy ngay và xác nhận nhanh"; (2) "Khi nhập hàng mới, tôi muốn tạo sản phẩm có nhiều biến thể trong một lần"; (3) "Khi khách phàn nàn, tôi muốn tìm đơn theo SĐT/mã đơn trong vài giây"; (4) "Cuối ngày, tôi muốn biết doanh thu và hàng nào sắp hết".

## 3. Hiện trạng (audit code thực tế)

**Cấu trúc:** `AdminApp.tsx` (71 dòng) tự dựng sidebar `bg-slate-900` + header + `Routes`; NAV có 7 mục: Tổng quan, Sản phẩm, Đơn hàng, Danh mục, Mã giảm giá, Đánh giá, Cài đặt. Thành phần dùng chung nằm gọn trong `components/admin/ui.tsx` (`DataTable` có sort server, `PageHeader`, `OrderStatusBadge`, `QueryError`, `Pagination`). Không có Breadcrumb, Toast, Modal, Drawer, Skeleton riêng cho admin.

**API admin hiện có** (`routes/api.php`, prefix `admin`, `auth:sanctum` + `can:admin` + `throttle:admin`): dashboard; products CRUD + upload ảnh; categories CRUD; coupons CRUD; orders index/show/patch status; reviews index/patch/delete. Bảng `admin_audit_logs` **đã có** (ghi từ Product/Order/Category/Coupon/Review) nhưng **chưa có API đọc**. **Chưa có** API admin cho thương hiệu, người dùng, cài đặt.

| Màn hình | Vấn đề | Mức độ |
|---|---|---|
| Lối vào | Header shop không có link "Trang quản trị"; đăng nhập admin không tự chuyển tới `/admin` | 🔴 Cao |
| Layout | Sidebar phẳng, không nhóm; không breadcrumb; không tìm kiếm toàn cục; trên mobile menu là dải tab cuộn ngang; route `*` chỉ là một dòng `<p>` | 🟠 Trung bình |
| Tổng quan | 7 thẻ KPI cùng cỡ, không so sánh kỳ trước; biểu đồ cột tự vẽ không trục, không tooltip bàn phím; "Biến thể sắp hết hàng" không có link | 🟠 |
| Đơn hàng | Không bulk action; lọc hạn chế; không lọc theo ngày/thanh toán; không xuất CSV | 🟠 |
| Chi tiết đơn | Đổi trạng thái bằng form + textarea ghi chú; chưa có timeline trực quan, không in phiếu | 🟠 |
| Sản phẩm – form | 241 dòng một trang dài; **mô tả là `<textarea>` HTML thô font-mono**; không autosave/cảnh báo rời trang; đổi SKU giữa 2 biến thể trong cùng một lần lưu bị lỗi trùng SKU (check unique từng dòng) | 🔴 |
| Danh mục | Danh sách phẳng + form bên cạnh, chưa hiển thị cây cha–con, không kéo thả sắp xếp | 🟡 Thấp |
| Thương hiệu | **Chưa có màn hình** (chỉ có API shop đọc) | 🟠 |
| Mã giảm giá | Bảng + form; không thống kê lượt dùng, không nhân bản mã | 🟡 |
| Đánh giá | Ẩn/hiện/xoá từng cái; không bulk, không xem ảnh phóng to | 🟡 |
| Người dùng | **Chưa có màn hình & API** (khoá/mở, đổi vai trò) | 🟠 |
| Nhật ký thao tác | Có bảng DB nhưng **không có màn hình & API đọc** | 🟡 |
| Cài đặt | Trang trống (theo yêu cầu) | 🟡 |
| Xác nhận xoá | Dùng `window.confirm` của trình duyệt (không theo giao diện, không dark mode) | 🟠 |
| Chính tả | Admin dùng "Xoá", shop dùng "Xóa" (`FilterDrawer`) → thống nhất **"Xóa"** | 🟡 |
| Dark mode | Nhiều lớp `bg-white`/`text-slate-900` cứng, sidebar `theme-fixed` | 🟡 |

## 4. Kiến trúc thông tin & điều hướng mới

### 4.1 Sidebar theo nhóm (thu gọn được, nhớ trạng thái trong `localStorage`)
```
⚡ Core Admin
──────────────
TỔNG QUAN
  ▸ Bảng điều khiển            /admin
BÁN HÀNG
  ▸ Đơn hàng      [12]          /admin/don-hang        (badge = đơn chờ xác nhận)
  ▸ Mã giảm giá                 /admin/ma-giam-gia
CATALOG
  ▸ Sản phẩm                    /admin/san-pham
  ▸ Danh mục                    /admin/danh-muc
  ▸ Thương hiệu   (mới)         /admin/thuong-hieu
KHÁCH HÀNG
  ▸ Người dùng    (mới)         /admin/nguoi-dung
  ▸ Đánh giá      [3]           /admin/danh-gia
HỆ THỐNG
  ▸ Nhật ký thao tác (mới)      /admin/nhat-ky
  ▸ Cài đặt                     /admin/cai-dat
──────────────
↗ Xem cửa hàng
```
- Giữ nguyên các URL tiếng Việt hiện có (không phá link cũ).
- Tablet (768–1279px): sidebar thu thành rail icon 64px + tooltip; mobile (<768px): drawer mở bằng nút ☰.

### 4.2 Topbar
`[☰] Breadcrumb: Bán hàng / Đơn hàng / DH-0012   [🔍 Tìm nhanh… Ctrl+K]   [🌙] [👤 Tên ▾ (Hồ sơ · Xem cửa hàng · Đăng xuất)]`

### 4.3 Breadcrumb
Sinh tự động từ cấu hình route (`adminRoutes.ts`: path, nhãn, nhóm, icon) — một nguồn sự thật cho sidebar + breadcrumb + tiêu đề `<Seo>`.

### 4.4 Tìm kiếm toàn cục (Command palette)
Ctrl/⌘+K → hộp thoại: nhóm kết quả "Đơn hàng" (mã đơn, SĐT), "Sản phẩm" (tên, SKU), "Người dùng" (email) + "Lệnh nhanh" (Tạo sản phẩm, Tạo mã giảm giá). Debounce 250 ms, điều hướng bằng phím ↑↓ Enter.

### 4.5 Lối vào từ cửa hàng
- Menu tài khoản ở header shop: mục **"Trang quản trị"** chỉ hiện khi `user.role === 'admin'`.
- Sau đăng nhập: nếu là admin và không có `?redirect=` → chuyển tới `/admin`.

## 5. Design system cho admin

### 5.1 Lưới & bố cục
- Khung: sidebar 240px (rail 64px) + nội dung `max-w-[1440px]`, padding 24px (16px tablet).
- Lưới 12 cột, gutter 24px. Trang danh sách: full width; trang form: 2 cột 8/4 (nội dung chính / panel phụ "Trạng thái, Xuất bản, SEO").
- Thanh hành động dính (sticky) ở đáy form: `[Hủy] [Lưu nháp] [Lưu]`.

### 5.2 Token (CSS variables trong Tailwind v4 `@theme`)
| Token | Sáng | Tối |
|---|---|---|
| `--admin-bg` | slate-50 | slate-950 |
| `--admin-surface` | white | slate-900 |
| `--admin-border` | slate-200 | slate-800 |
| `--admin-text` / `-muted` | slate-900 / slate-500 | slate-100 / slate-400 |
| `--primary` | blue-600 `#2563EB` | blue-500 |
| `--accent` | amber-500 `#F59E0B` | amber-400 |
| `--success` / `--danger` / `--warning` / `--info` | emerald-500 / red-500 / amber-500 / cyan-500 | bản 400 |
| Bo góc | 8px (control), 12px (card) | — |
| Bóng | `shadow-sm` card, `shadow-xl` modal/drawer | — |
Không dùng màu cứng trong component; chỉ dùng token → dark mode tự đúng. Bỏ `theme-fixed` ở sidebar.

### 5.3 Typography
Be Vietnam Pro (đã định ở mục 5.2 kế hoạch gốc). Cỡ: H1 24/32 semibold, H2 18/28, body 14/20, caption 12/16. Số tiền & số lượng: `tabular-nums`, căn phải trong bảng.

### 5.4 Mật độ
Mặc định "Vừa" (hàng bảng 48px); tùy chọn "Gọn" (36px) lưu theo người dùng — phù hợp nhân viên xử lý đơn.

### 5.5 Thành phần
| Component | Yêu cầu |
|---|---|
| **DataTable v2** | Sort server (giữ API hiện tại), thanh lọc (chip + popover), tìm kiếm debounce, chọn nhiều hàng (checkbox, Shift-click) → **thanh bulk action** nổi; ẩn/hiện cột; **chế độ xem đã lưu** ("Đơn chờ xác nhận", "Hàng sắp hết") lưu `localStorage` + đồng bộ URL query; hàng skeleton khi tải; sticky header; trên tablet chuyển cột phụ vào hàng mở rộng |
| **Form** | `FormField` thống nhất (label, gợi ý, lỗi từ `errors` chuẩn `{success,code,message,errors}`), đánh dấu bắt buộc `*`, cảnh báo rời trang khi có thay đổi chưa lưu, phím Ctrl+S lưu |
| **Drawer** | Phải, 480px; dùng cho sửa nhanh (danh mục, thương hiệu, mã giảm giá, xem nhanh đơn); focus trap + ESC |
| **Modal xác nhận** | Thay `window.confirm`; nút nguy hiểm màu đỏ, nêu hậu quả; xoá mục quan trọng yêu cầu gõ lại tên |
| **Toast** | Góc phải dưới, tự ẩn 4 s, có "Hoàn tác" cho thao tác ẩn/hiện; `aria-live="polite"` |
| **Trạng thái trống/tải/lỗi** | `EmptyState` (icon + câu + nút hành động, vd "Chưa có mã giảm giá nào. [+ Tạo mã]"), `Skeleton`, `ErrorState` ("Không tải được dữ liệu. [Thử lại]") — không lộ lỗi kỹ thuật |
| **Badge** | Đơn: Chờ xác nhận (amber), Đã xác nhận (blue), Đóng gói (indigo), Đang giao (cyan), Đã giao (emerald), Đã hủy (red), Trả hàng (slate). Thanh toán: Chưa thanh toán (amber), Đã thanh toán (emerald), Hoàn tiền (slate), Thất bại (red). Luôn có chữ, không chỉ màu |
| **KPI Card** | Giá trị, so sánh kỳ trước (▲/▼ %), sparkline, link tới danh sách đã lọc |
| **Chart** | Thư viện nhẹ (đề xuất `recharts` lazy hoặc SVG tự viết có trục, tooltip, bảng dữ liệu ẩn cho trình đọc màn hình) |
| **RichTextEditor** | Tiptap (StarterKit + Link + Image + Table) lazy-load; xuất HTML, **server vẫn sanitize** (theo v2) |

### 5.6 Ngôn ngữ
Toàn bộ tiếng Việt; thống nhất "Xóa", "Hủy" (dấu đặt theo kiểu cũ: hóa, xóa, hủy) — rà toàn repo một lần ở Pha R0; file `copy.ts` chứa nhãn dùng chung.

## 6. Đặc tả từng màn hình (wireframe dạng chữ)

### 6.1 Bảng điều khiển `/admin`
```
Bảng điều khiển                     [Hôm nay ▾ | 7 ngày | 14 ngày | 30 ngày]
┌Doanh thu───┐┌Đơn hàng────┐┌Chờ xác nhận┐┌Sắp hết hàng┐
│ 12.500.000₫││ 18         ││ 5  → Xử lý ││ 7 → Xem    │
│ ▲ 12% kỳ trước│ ▼ 3%     ││            ││            │
└────────────┘└────────────┘└────────────┘└────────────┘
┌ Doanh thu theo ngày (cột + đường số đơn) ──────────┐ ┌ Việc cần làm ─────────┐
│  ▇ ▅ ▇ ▃ ...                                      │ │ • 5 đơn chờ xác nhận  │
└───────────────────────────────────────────────────┘ │ • 3 đánh giá đang ẩn  │
┌ Đơn gần đây (5) ─────────────┐┌ Sắp hết hàng ─────┐ │ • 2 mã sắp hết hạn    │
└──────────────────────────────┘└───────────────────┘ └───────────────────────┘
```
Dữ liệu sẵn có: `stats.*`, `revenue_series` (14 ngày), `recent_orders`, `low_stock`. Cần thêm: tham số `range`, giá trị kỳ trước, top sản phẩm bán chạy, mã sắp hết hạn.

### 6.2 Đơn hàng — danh sách `/admin/don-hang`
```
Đơn hàng                                                 [⤓ Xuất CSV]
[Tất cả 120][Chờ xác nhận 5][Đã xác nhận][Đóng gói][Đang giao][Đã giao][Đã hủy]
[🔍 Mã đơn, tên, SĐT]  [Thanh toán ▾] [Phương thức ▾] [Ngày: từ–đến]  [Xem đã lưu ▾]
☐ | Mã đơn | Khách / SĐT | SL | Tổng | Thanh toán | Trạng thái | Ngày đặt | ⋯
── khi chọn: "Đã chọn 3 đơn  [Xác nhận] [Chuyển Đóng gói] [In phiếu] [Bỏ chọn]"
```
Bulk chỉ cho chuyển trạng thái hợp lệ theo state machine backend; kết quả trả về từng đơn (thành công/thất bại + lý do).

### 6.3 Chi tiết đơn `/admin/don-hang/:id`
```
← Đơn hàng / DH-0012   [Chờ xác nhận]  [Thanh toán: COD – Chưa thanh toán]
                                       [In phiếu] [Hủy đơn] [Xác nhận đơn ▶]
┌ Sản phẩm (ảnh, tên, biến thể, SKU, SL, đơn giá, thành tiền) ┐ ┌ Khách hàng ──┐
│ Tạm tính / Giảm giá (mã GIAM10) / Phí ship / Tổng cộng       │ │ tên, SĐT, email│
└─────────────────────────────────────────────────────────────┘ │ Địa chỉ giao  │
┌ Dòng thời gian ─────────────────────────────────────────────┐ └───────────────┘
│ ● 26/10 09:12 Đặt hàng                                      │ ┌ Ghi chú nội bộ┐
│ ● 26/10 10:00 Đã xác nhận — admin@… "Gọi khách OK"          │ │ [textarea][Lưu]│
│ ○ Đóng gói  ○ Đang giao  ○ Đã giao                          │ └───────────────┘
└─────────────────────────────────────────────────────────────┘
```
Nút hành động chính = bước kế tiếp hợp lệ; "Hủy đơn" mở modal bắt buộc nhập lý do (`cancel_reason` đã có). Timeline lấy từ lịch sử trạng thái/audit log (cần kiểm tra API show đã trả lịch sử chưa → mục 9).

### 6.4 Sản phẩm — danh sách `/admin/san-pham`
Cột: ☐ | Ảnh | Tên + SKU đầu | Danh mục | Thương hiệu | Giá (min–max) | Tồn kho (tổng, đỏ nếu thấp) | Trạng thái (Đang bán/Ẩn) | Cập nhật | ⋯ (Sửa, Nhân bản, Xem ngoài shop, Xóa).
Lọc: danh mục, thương hiệu, trạng thái, tồn kho thấp. Bulk: Ẩn/Hiện, Xóa, Gán danh mục.

### 6.5 Sản phẩm — trình soạn `/admin/san-pham/moi`, `/:id`
```
← Sản phẩm / Ổ cắm âm tường X        [Xem ngoài shop ↗]  ● Có thay đổi chưa lưu
[Thông tin chung][Biến thể & tồn kho][Hình ảnh][Thông số kỹ thuật][SEO]     (tab, giữ ?tab=)
┌ Cột chính 8/12 ─────────────────────────────┐ ┌ Panel 4/12 ─────────────┐
│ Tên *, Slug (tự sinh, sửa được)             │ │ Trạng thái: Đang bán ▾  │
│ Mô tả ngắn                                  │ │ Danh mục (chọn cây)      │
│ Mô tả: [B I U • 1. 🔗 🖼 ▦ ↶ ↷] RichText    │ │ Thương hiệu ▾            │
│                                              │ │ Kiểm tra hoàn thiện: ✓ ảnh│
└──────────────────────────────────────────────┘ │ ✓ mô tả  ✗ SEO          │
                                                  └──────────────────────────┘
Tab Biến thể: bảng sửa trực tiếp | Tên/thuộc tính | SKU | Giá | Giá gốc | Tồn | Mặc định | ⋯
  [+ Thêm biến thể] [Tạo tổ hợp từ thuộc tính (Công suất × Màu)] [Sửa giá hàng loạt]
────────────────────────────── [Hủy] [Lưu]  (sticky)
```
- **Sửa lỗi đổi SKU:** validate trùng SKU **trong payload** ở frontend; backend kiểm unique ngoại trừ các biến thể thuộc chính sản phẩm và cập nhật trong transaction (đặt SKU tạm rồi ghi SKU mới) — mục 9.
- Ảnh: kéo thả, sắp xếp, chọn ảnh đại diện, tiến trình upload (API upload đã có, ảnh WebP).
- Trang shop hiển thị mô tả (việc tồn đọng) gộp vào cùng pha.

### 6.6 Danh mục `/admin/danh-muc`
Cây thu/mở (tên, số SP, số danh mục con), kéo thả đổi thứ tự/cha (`sort_order`, `parent_id`), sửa trong drawer; không cho xóa khi còn SP/danh mục con (hiển thị lý do).

### 6.7 Thương hiệu `/admin/thuong-hieu` (mới)
Bảng: Logo | Tên | Slug | Số SP | Hiển thị | ⋯; tạo/sửa trong drawer (upload logo dùng `ImageSanitizer`).

### 6.8 Mã giảm giá `/admin/ma-giam-gia`
Bảng: Mã | Loại (Giảm %/Giảm tiền/Miễn phí ship) | Giá trị | Đơn tối thiểu | Đã dùng/Giới hạn (thanh tiến độ) | Hiệu lực (badge Sắp diễn ra/Đang chạy/Hết hạn) | ⋯ (Sửa, Nhân bản, Tắt). Form trong drawer, có xem trước "Khách mua 500.000₫ được giảm 50.000₫".

### 6.9 Đánh giá `/admin/danh-gia`
Dạng danh sách thẻ: sao, nội dung, ảnh (lightbox), khách, sản phẩm, ngày; tab Tất cả/Đang hiện/Đang ẩn; lọc theo số sao; bulk Ẩn/Hiện; Xóa qua modal. Toast có "Hoàn tác" cho Ẩn/Hiện.

### 6.10 Người dùng `/admin/nguoi-dung` (mới)
Bảng: Tên | Email (✓ đã xác thực) | SĐT | Vai trò | Trạng thái (Hoạt động/Đã khóa) | Số đơn | Ngày tạo. Chi tiết (drawer): đơn gần đây, đánh giá. Hành động: Khóa/Mở khóa, đổi vai trò (không cho tự khóa/tự hạ quyền chính mình, không hạ admin cuối cùng). Không hiển thị/đặt mật khẩu; chỉ "Gửi email đặt lại mật khẩu".

### 6.11 Nhật ký thao tác `/admin/nhat-ky` (mới)
Bảng chỉ đọc: Thời gian | Người thực hiện | Hành động | Đối tượng (link) | Chi tiết (xem diff trước/sau trong drawer). Lọc theo người, loại đối tượng, khoảng ngày.

### 6.12 Cài đặt `/admin/cai-dat` — đề xuất phạm vi (giữ trống cho tới khi chốt)
Các nhóm có thể làm: (a) Thông tin cửa hàng (tên, hotline, địa chỉ, email — hiện nằm cứng ở `shopContact.ts`); (b) Vận chuyển (phí ship, ngưỡng miễn phí); (c) Tồn kho (ngưỡng "sắp hết"); (d) Hồ sơ admin (đổi tên, mật khẩu). Cần bảng `settings` key–value + cache Redis.

## 7. Truy cập (a11y) & responsive
- Mọi thao tác dùng được bằng bàn phím; thứ tự focus hợp lý; vòng focus rõ (`ring-2 ring-blue-500`); "Bỏ qua tới nội dung".
- Modal/drawer: `role="dialog"`, `aria-modal`, focus trap, ESC, trả focus về nút mở.
- Bảng: `<th scope>`, `aria-sort` (đã có), checkbox có nhãn "Chọn đơn DH-0012".
- Tương phản ≥ 4.5:1 cả hai chế độ; badge luôn có chữ.
- Toast `aria-live`; lỗi form gắn `aria-describedby`.
- Breakpoint: ≥1280 sidebar đầy đủ; 768–1279 rail icon, bảng ẩn cột phụ; <768 drawer menu, bảng chuyển thành thẻ, form 1 cột. Mục tiêu chính là **tablet** (nhân viên kho dùng iPad).
- Vùng chạm ≥ 40px trên tablet.

## 8. Hiệu năng
- Mỗi trang admin là một chunk `lazy()` riêng (đã tách bundle admin ở Pha 7, nay tách tiếp theo route); Tiptap và thư viện biểu đồ chỉ tải khi mở trang dùng chúng.
- TanStack Query: giữ `staleTime` 2 phút mặc định; dashboard 1 phút + `refetchOnWindowFocus`; danh sách dùng `keepPreviousData`; prefetch chi tiết khi hover hàng; cập nhật lạc quan cho Ẩn/Hiện đánh giá, đổi trạng thái đơn; invalidate theo key (`['admin','orders']`...).
- Badge số đơn chờ: dùng lại `stats.pending_orders` với `refetchInterval` 60 s (không cần websocket ở giai đoạn này).
- Ảnh danh sách dùng thumbnail nhỏ, `loading="lazy"`.

## 9. Khoảng trống API backend

| API | Trạng thái | Ghi chú |
|---|---|---|
| `GET /admin/dashboard` | ✅ Có sẵn — 🔧 cần sửa | Thêm `range`, so sánh kỳ trước, top sản phẩm, mã sắp hết hạn |
| `GET /admin/orders` (lọc, sort) | ✅ Có sẵn — 🔧 cần sửa | Thêm lọc ngày, thanh toán, phương thức, đếm theo trạng thái cho tab |
| `GET /admin/orders/{id}` | ✅ Có sẵn — 🔧 kiểm tra | Trả lịch sử trạng thái (timeline) nếu chưa có |
| `PATCH /admin/orders/{id}/status` | ✅ Có sẵn | |
| `POST /admin/orders/bulk-status` | 🆕 Cần mới | Trả kết quả từng đơn |
| `GET /admin/orders/export` | 🆕 Cần mới | CSV, throttle riêng |
| `PATCH /admin/orders/{id}/note` | 🆕 Cần mới (hoặc gộp status) | Ghi chú nội bộ |
| Products CRUD + upload ảnh | ✅ Có sẵn — 🔧 cần sửa | Sửa unique SKU khi hoán đổi; thêm lọc tồn thấp/thương hiệu; `POST /products/{id}/duplicate` 🆕; bulk ẩn/hiện 🆕 |
| Categories CRUD | ✅ Có sẵn — 🔧 | `PATCH /admin/categories/reorder` 🆕 cho kéo thả |
| Brands admin CRUD | 🆕 Cần mới | Hiện chỉ có API shop đọc |
| Coupons CRUD | ✅ Có sẵn — 🔧 | Trả `used_count`; nhân bản 🆕 |
| Reviews index/patch/delete | ✅ Có sẵn — 🔧 | Bulk moderate 🆕, lọc theo sao |
| Users admin (list/show/khóa/đổi vai trò) | 🆕 Cần mới | Policy chặn tự khóa, admin cuối |
| `GET /admin/audit-logs` | 🆕 Cần mới | Bảng `admin_audit_logs` đã có |
| `GET /admin/search?q=` | 🆕 Cần mới | Tìm toàn cục, giới hạn 5 kết quả/nhóm |
| Settings get/put | 🆕 Cần mới | Chỉ khi chốt phạm vi |
| `/me` trả `role` | ✅ Có sẵn (Gate dùng) | Frontend dùng để hiện link admin |

Mọi API mới theo chuẩn hiện có: FormRequest `validated()`, Policy, lỗi chuẩn, ghi audit log, test Feature trên SQLite container (không đụng DB dev).

## 10. Lộ trình triển khai (mỗi bước ≈ 1 commit trên nhánh `Luke`)

| Pha | Tên | Nội dung | Tiêu chí nghiệm thu | Ước lượng |
|---|---|---|---|---|
| **R0** | Lối vào & dọn dẹp | Link "Trang quản trị" ở menu tài khoản shop (chỉ admin), chuyển tới `/admin` sau đăng nhập; thống nhất "Xóa"/"Hủy"; trang 404 admin đúng giao diện | Admin đăng nhập tự vào `/admin`; user thường không thấy link; grep không còn "Xoá" | 0,5 ngày |
| **R1** | Nền tảng design system | Token sáng/tối, `adminRoutes.ts`, AdminLayout mới (sidebar nhóm, rail, drawer mobile, topbar, breadcrumb) | Đủ 3 breakpoint; dark mode không còn màu cứng; test vitest điều hướng | 1,5 ngày |
| **R2** | Bộ component | Modal xác nhận (thay `window.confirm`), Drawer, Toast, Skeleton, EmptyState, ErrorState, Badge đơn/thanh toán, FormField v2 | Không còn `window.confirm`; axe không lỗi nghiêm trọng | 1,5 ngày |
| **R3** | DataTable v2 | Lọc chip, chọn nhiều + bulk bar, ẩn cột, xem đã lưu, đồng bộ URL, mật độ | Áp vào Sản phẩm & Đánh giá; test chọn/bulk | 2 ngày |
| **R4** | Đơn hàng | Tab trạng thái có đếm, lọc ngày/thanh toán, bulk đổi trạng thái, CSV, chi tiết có timeline + ghi chú + modal hủy (kèm API) | Xác nhận đơn ≤ 3 click; bulk trả lỗi từng đơn; test Feature API | 2,5 ngày |
| **R5** | Trình soạn sản phẩm | Tab + panel phụ, Tiptap (lazy, sanitize server), biến thể bảng sửa trực tiếp, sửa lỗi hoán đổi SKU, ảnh kéo thả, cảnh báo rời trang, nhân bản; shop hiển thị mô tả | Hoán đổi SKU 2 biến thể lưu thành công (có test); HTML độc bị loại | 3 ngày |
| **R6** | Bảng điều khiển | KPI so sánh kỳ, chọn khoảng ngày, biểu đồ có trục/tooltip/bảng ẩn, "Việc cần làm" | Lighthouse a11y ≥ 95; số liệu khớp API | 1,5 ngày |
| **R7** | Catalog phụ | Cây danh mục kéo thả + API reorder; màn hình & API Thương hiệu | Đổi thứ tự lưu được; CRUD thương hiệu có test | 2 ngày |
| **R8** | Khuyến mãi & đánh giá | Mã giảm giá trong drawer, lượt dùng, nhân bản, xem trước; đánh giá dạng thẻ, lightbox, bulk, hoàn tác | Test bulk moderate; hoàn tác hoạt động | 1,5 ngày |
| **R9** | Người dùng & nhật ký | API + màn hình Người dùng (khóa/vai trò, chặn tự khóa), Nhật ký thao tác có diff | Không tự khóa được chính mình (test); nhật ký lọc được | 2,5 ngày |
| **R10** | Tìm kiếm toàn cục | API `/admin/search` + command palette Ctrl+K | Phím tắt, điều hướng bàn phím, < 300 ms | 1 ngày |
| **R11** | Cài đặt (tùy chọn) | Theo phạm vi được chốt ở câu hỏi mở | Do người dùng duyệt | 1–2 ngày |
| **R12** | Hoàn thiện | Rà a11y, tablet thực tế, Lighthouse, kích thước chunk, cập nhật tài liệu | Đạt chỉ số mục 1 | 1 ngày |

Tổng ước lượng: ~21–23 ngày công. R0 có thể làm ngay; R1→R3 là tiền đề cho các pha sau; R4–R10 tách độc lập.

## 11. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Thay layout làm hỏng test `AdminApp.test.tsx` hiện có | Cập nhật test cùng commit; giữ nguyên URL |
| Tiptap/recharts làm phình bundle | Lazy-load, đo kích thước chunk mỗi pha |
| Rich text gây XSS | Sanitize phía server (HTMLPurifier hoặc tương đương) + test payload độc |
| Bulk action đổi trạng thái sai hàng loạt | Modal xác nhận nêu số lượng, chỉ cho chuyển hợp lệ, ghi audit log |
| Quản lý người dùng có thể khóa nhầm admin | Policy chặn tự khóa & admin cuối cùng |
| Dữ liệu cũ (mô tả HTML thô) hiển thị khác trong Tiptap | Chuyển đổi khi mở, không ghi đè cho tới khi người dùng lưu |

## 12. Câu hỏi mở cần bạn quyết định
1. **Phân quyền:** chỉ giữ một vai trò `admin`, hay thêm vai trò nhân viên (xử lý đơn / nội dung) với quyền hạn chế?
2. **Trang Cài đặt:** làm những nhóm nào (thông tin cửa hàng, vận chuyển, ngưỡng tồn kho, hồ sơ admin) hay tiếp tục để trống?
3. **Thương hiệu "Core Điện":** giữ tên này hay đổi lại? (ảnh hưởng logo sidebar admin)
4. **Trình soạn mô tả:** đồng ý dùng Tiptap (WYSIWYG) hay muốn Markdown?
5. **Biểu đồ:** dùng thư viện `recharts` (đẹp, ~+90 KB lazy) hay SVG tự viết (nhẹ, ít tính năng)?
6. **Xuất CSV / in phiếu giao hàng:** có cần ngay ở R4 không?
7. **Thông báo đơn mới:** chỉ badge làm mới 60 s là đủ, hay cần âm thanh/thông báo trình duyệt?
8. **Thiết bị chính** của nhân viên: máy tính hay máy tính bảng? (quyết định ưu tiên responsive)
9. **Thứ tự ưu tiên:** đồng ý thứ tự R0 → R12, hay muốn làm Đơn hàng / Sản phẩm trước?
10. **Thêm lệnh `php artisan admin:create`** vào R0 không?
