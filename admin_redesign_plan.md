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
| **Nhân viên xử lý đơn** | Dùng nhiều nhất, thao tác lặp | Lọc đơn chờ, xác nhận, đóng gói, giao, hủy có lý do, ghi chú nội bộ |
| **Nhân viên nội dung/kho** | Quản lý catalog | Thêm/sửa sản phẩm, biến thể, ảnh, thông số kỹ thuật, tồn kho, danh mục, thương hiệu |
| **Kiểm duyệt** | Chăm sóc uy tín | Ẩn/hiện/xoá đánh giá, xem ảnh đánh giá |

> Đã chốt: Quản trị viên (toàn quyền) + nhân viên mang vai trò cấu hình được từ các quyền chi tiết (RBAC) — xem mục 4.6.

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
⚡ Đồ Điện Siêu Xịn · Quản trị
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
  ▸ Vai trò & phân quyền (mới) /admin/vai-tro
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

### 4.6 Vai trò & phân quyền — RBAC theo quyền chi tiết (đã chốt)
Nguyên tắc: **Quản trị viên** có mọi quyền, không thể bị giới hạn. Nhân viên được gán **một hoặc nhiều vai trò**. Quyền hiệu lực là **hợp (union)** quyền của mọi vai trò được gán. Mỗi vai trò là tập hợp các **quyền chi tiết**. Ví dụ: Quản lý sản phẩm **không** thấy doanh thu, còn Kế toán **thấy**.

**Danh mục quyền (permission key)**
| Nhóm | Quyền | Ý nghĩa |
|---|---|---|
| Tổng quan | `dashboard.view` | Vào bảng điều khiển (widget vận hành: đơn chờ, sắp hết hàng) |
| | `dashboard.revenue.view` | Thấy doanh thu, giá trị đơn, biểu đồ doanh thu |
| Đơn hàng | `orders.view` · `orders.update` · `orders.print` · `orders.cancel` · `orders.export` | Xem · đổi trạng thái/ghi chú · in phiếu · hủy đơn · xuất CSV |
| Sản phẩm | `products.view` · `products.edit` · `products.delete` | Xem · thêm/sửa (gồm biến thể, ảnh, tồn kho) · xóa |
| Catalog | `categories.manage` · `brands.manage` | Thêm/sửa/xóa danh mục, thương hiệu |
| Khuyến mãi | `coupons.view` · `coupons.manage` | Xem · tạo/sửa/xóa mã giảm giá |
| Đánh giá | `reviews.moderate` · `reviews.delete` | Ẩn/hiện · xóa vĩnh viễn |
| Hệ thống | `users.manage` · `roles.manage` · `audit.view` · `settings.manage` | Người dùng · vai trò & phân quyền · nhật ký · cài đặt |

> `users.manage`, `roles.manage`, `settings.manage` mặc định **chỉ Quản trị viên**. Vẫn có thể gán cho vai trò tùy chỉnh, trừ `roles.manage` (luôn chỉ admin, tránh tự nâng quyền).

**Vai trò mẫu (preset, admin sửa được)**
| Quyền | Quản lý sản phẩm | Xử lý đơn hàng (kho/giao hàng) | Kế toán | Chăm sóc khách hàng |
|---|:-:|:-:|:-:|:-:|
| dashboard.view | ✅ | ✅ | ✅ | ✅ |
| dashboard.revenue.view | ❌ | ❌ | ✅ | ❌ |
| orders.view | ❌ | ✅ | ✅ | ✅ |
| orders.update | ❌ | ✅ | ❌ | ❌ |
| orders.print | ❌ | ✅ | ✅ | ❌ |
| orders.cancel | ❌ | ❌ | ❌ | ❌ |
| orders.export | ❌ | ❌ | ✅ | ❌ |
| products.view | ✅ | ✅ | ✅ | ✅ |
| products.edit | ✅ | ❌ | ❌ | ❌ |
| products.delete | ✅ | ❌ | ❌ | ❌ |
| categories.manage / brands.manage | ✅ | ❌ | ❌ | ❌ |
| coupons.view | ✅ | ❌ | ✅ | ✅ |
| coupons.manage | ❌ | ❌ | ❌ | ❌ |
| reviews.moderate | ❌ | ❌ | ❌ | ✅ |
| reviews.delete | ❌ | ❌ | ❌ | ❌ |
| audit.view | ❌ | ❌ | ❌ | ❌ |
| users / roles / settings | ❌ | ❌ | ❌ | ❌ |

**Màn hình "Vai trò & phân quyền"** `/admin/vai-tro` (chỉ Quản trị viên, nhóm HỆ THỐNG):
```
Vai trò & phân quyền                               [+ Tạo vai trò]
| Vai trò             | Số nhân viên | Loại      | ⋯ (Sửa, Nhân bản, Xóa)
| Quản lý sản phẩm    | 2            | Mẫu       |
| Kế toán             | 1            | Mẫu       |
Sửa vai trò: Tên *, Mô tả; ma trận checkbox theo nhóm quyền (chọn cả nhóm);
             cảnh báo "3 nhân viên sẽ bị ảnh hưởng"  [Hủy] [Lưu]
```
Không xóa được vai trò còn nhân viên (phải gỡ vai trò khỏi họ trước). Gán vai trò ở màn hình Người dùng bằng **ô chọn nhiều vai trò** (multi-select dạng chip), kèm khung xem trước "Quyền hiệu lực" (hợp các vai trò, ghi rõ quyền nào đến từ vai trò nào).
> Ghi chú: *Hủy đơn* (`orders.cancel`) không thuộc vai trò mẫu nào. Chăm sóc khách hàng chỉ tiếp nhận yêu cầu của khách rồi phối hợp với bộ phận liên quan, nên mặc định chỉ Quản trị viên hủy được, hoặc admin tự gán quyền này cho một vai trò tùy chỉnh.

**Bảng điều khiển theo quyền:** widget doanh thu (KPI doanh thu, biểu đồ, tổng tiền trong "Đơn gần đây") chỉ render khi có `dashboard.revenue.view`. **Server cũng bỏ hẳn các trường doanh thu** khỏi `GET /admin/dashboard` và bỏ cột tổng tiền nếu thiếu quyền, nên không lộ qua DevTools.

**Thực thi**
- Server: `Gate::before` cho phép mọi thứ với admin; mỗi quyền là một Gate `Gate::define('orders.update', fn ($u) => $u->hasPermission('orders.update'))`. Các Policy hiện có chuyển sang gọi quyền. Middleware `/api/admin/*` đổi `can:admin` thành `can:admin-area` (admin, hoặc staff có ít nhất 1 quyền, và is_active). Quyền hiệu lực (union) của user được cache trong Redis với khóa `perm:user:{id}`. Cache bị xóa khi: (a) gán hoặc gỡ vai trò của user; (b) sửa quyền của một vai trò, khi đó xóa cache của mọi user mang vai trò đó; (c) xóa vai trò; (d) khóa user.
- Frontend: `/me` trả thêm `permissions: string[]` (admin trả `["*"]`); hook `useCan('orders.update')` ẩn menu, nút và cột. Route không có quyền hiện trang "Bạn không có quyền truy cập" (403). **Ẩn ở frontend chỉ để tiện dùng, server luôn chặn.**
- Nhật ký: ghi audit khi tạo/sửa/xóa vai trò (diff danh sách quyền) và khi **gán/gỡ vai trò** của nhân viên (ghi danh sách vai trò trước và sau, cùng người thực hiện).

**Mô hình dữ liệu**
- `roles` (id, name, slug, description, is_preset, timestamps)
- `permissions` (id, key unique, group, label). Seed từ một danh sách trong code (`config/permissions.php`), đồng bộ bằng seeder idempotent.
- `role_permission` (role_id, permission_id) với PK kép
- `user_role` (user_id, role_id, assigned_by, created_at) với PK kép: quan hệ nhiều–nhiều giữa users và roles. Nhân viên có thể mang 1 hoặc nhiều vai trò.
- **Tương thích:** giữ cột `users.role` với giá trị `admin` / `customer` / `staff`. `admin` vẫn là siêu quyền và không cần dòng trong `user_role`; `staff` phải có ít nhất 1 vai trò (validate khi lưu). Migration chỉ thêm bảng (không đổi dữ liệu cũ), nên Gate `admin` hiện tại vẫn chạy trong lúc chuyển đổi. Lệnh `admin:create` thêm `--role=staff` và `--staff-role` lặp lại được hoặc nhận danh sách cách nhau bởi dấu phẩy, ví dụ `--staff-role=ke-toan --staff-role=xu-ly-don` hoặc `--staff-role=ke-toan,xu-ly-don`.

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
| **Chart** | **Recharts** (đã chốt), lazy-load theo trang; luôn kèm bảng dữ liệu ẩn cho trình đọc màn hình |
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

### 6.1b Thông báo đơn mới (đã chốt)
- Cơ chế: polling nhẹ `GET /admin/orders/latest-id` mỗi 30 s (dừng khi tab ẩn). **Chỉ khi có đơn mới hơn đơn đã thấy** mới hiện toast "Có 2 đơn hàng mới — [Xem]" + phát **âm thanh nhẹ** (file ngắn < 20 KB, âm lượng thấp).
- Có nút bật/tắt âm thanh ở topbar (lưu `localStorage`); trình duyệt chặn autoplay → hiển thị gợi ý "Bấm để bật âm thanh thông báo" lần đầu.
- Không thông báo lặp khi tải lại trang (lưu id đơn cuối đã thấy).

### 6.2 Đơn hàng — danh sách `/admin/don-hang`
```
Đơn hàng                                   [⤓ Xuất CSV — để pha sau]
[Tất cả 120][Chờ xác nhận 5][Đã xác nhận][Đóng gói][Đang giao][Đã giao][Đã hủy]
[🔍 Mã đơn, tên, SĐT]  [Thanh toán ▾] [Phương thức ▾] [Ngày: từ–đến]  [Xem đã lưu ▾]
☐ | Mã đơn | Khách / SĐT | SL | Tổng | Thanh toán | Trạng thái | Ngày đặt | ⋯
── khi chọn: "Đã chọn 3 đơn  [Xác nhận] [Chuyển Đóng gói] [In phiếu] [Bỏ chọn]"
```
Bulk chỉ cho chuyển trạng thái hợp lệ theo state machine backend; kết quả trả về từng đơn (thành công/thất bại + lý do).

### 6.3 Chi tiết đơn `/admin/don-hang/:id`
```
← Đơn hàng / DH-0012   [Chờ xác nhận]  [Thanh toán: COD – Chưa thanh toán]
                                       [🖨 In phiếu giao hàng] [Hủy đơn] [Xác nhận đơn ▶]
┌ Sản phẩm (ảnh, tên, biến thể, SKU, SL, đơn giá, thành tiền) ┐ ┌ Khách hàng ──┐
│ Tạm tính / Giảm giá (mã GIAM10) / Phí ship / Tổng cộng       │ │ tên, SĐT, email│
└─────────────────────────────────────────────────────────────┘ │ Địa chỉ giao  │
┌ Dòng thời gian ─────────────────────────────────────────────┐ └───────────────┘
│ ● 26/10 09:12 Đặt hàng                                      │ ┌ Ghi chú nội bộ┐
│ ● 26/10 10:00 Đã xác nhận — admin@… "Gọi khách OK"          │ │ [textarea][Lưu]│
│ ○ Đóng gói  ○ Đang giao  ○ Đã giao                          │ └───────────────┘
└─────────────────────────────────────────────────────────────┘
```
**In phiếu giao hàng (đã chốt, làm ngay ở pha Đơn hàng):** trang `/admin/don-hang/:id/in` khổ A5/A4 với CSS `@media print`: tên, SĐT, địa chỉ cửa hàng (từ Cài đặt), mã đơn + mã vạch/QR, người nhận, sản phẩm, tổng tiền, số tiền thu hộ COD, ghi chú. In nhiều đơn từ bulk action.
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

### 6.12 Cài đặt `/admin/cai-dat` — phạm vi đã chốt (chỉ Quản trị viên)
```
Cài đặt   [Thông tin cửa hàng][Cấu hình chung][Tài khoản]
Thông tin cửa hàng: Tên cửa hàng *, Số điện thoại *, Địa chỉ *  → in trên phiếu giao hàng / hóa đơn
Cấu hình chung:     Phí vận chuyển mặc định (₫) *, Ngưỡng miễn phí vận chuyển (₫)
Tài khoản:          Mật khẩu hiện tại *, Mật khẩu mới *, Nhập lại *   [Đổi mật khẩu]
```
- Bảng `settings` key–value + cache Redis; checkout đọc phí ship/ngưỡng từ đây thay cho config cứng; `shopContact.ts` đọc từ API công khai `GET /settings/public`.
- Đổi mật khẩu dùng lại `changePassword` của tài khoản (đã có), đăng xuất các phiên khác.

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

## 10. Lộ trình triển khai (mỗi bước ≈ 1 commit trên nhánh `Luke`) — đã sắp lại theo quyết định

Thứ tự: **Nền tảng R0–R3 → Đơn hàng (R4) → Sản phẩm (R5) → phần còn lại.**

| Pha | Tên | Nội dung | Tiêu chí nghiệm thu | Ước lượng |
|---|---|---|---|---|
| **R0** | Lối vào & dọn dẹp | Link "Trang quản trị" (chỉ admin), chuyển tới `/admin` sau đăng nhập (tôn trọng `?redirect=`); lệnh `php artisan admin:create`; đổi thương hiệu thành "Đồ Điện Siêu Xịn"; thống nhất "Xóa"/"Hủy"; trang 404 admin | Admin tự vào `/admin`; khách không thấy link; không còn "Xoá/Huỷ", "Core Điện"; test lệnh | 0,5–1 ngày |
| **R1** | Nền tảng design system | Token sáng/tối, `adminRoutes.ts`, AdminLayout mới (sidebar nhóm, rail tablet, topbar, breadcrumb) | Desktop tối ưu, tablet tốt; dark mode không còn màu cứng | 1,5 ngày |
| **R2** | Bộ component | Modal xác nhận, Drawer, Toast, Skeleton, EmptyState, ErrorState, Badge, FormField v2 | Không còn `window.confirm`; axe không lỗi nghiêm trọng | 1,5 ngày |
| **R3** | DataTable v2 | Lọc chip, chọn nhiều + bulk bar, ẩn cột, xem đã lưu, URL, mật độ | Test chọn/bulk | 2 ngày |
| **R4** | ⭐ Đơn hàng | Tab có đếm, lọc ngày/thanh toán, bulk đổi trạng thái, chi tiết + timeline + ghi chú + modal hủy, **in phiếu giao hàng** (đơn lẻ & nhiều đơn), **thông báo đơn mới + âm thanh nhẹ** | Xác nhận đơn ≤ 3 click; phiếu in đúng khổ; âm thanh chỉ khi có đơn mới | 3,5 ngày |
| **R5** | ⭐ Sản phẩm | Trình soạn tab, **Tiptap**, biến thể sửa trực tiếp, sửa lỗi hoán đổi SKU, ảnh kéo thả, cảnh báo rời trang, nhân bản; shop hiển thị mô tả | Hoán đổi SKU thành công (test); HTML độc bị loại | 3 ngày |
| **R6** | Phân quyền RBAC | Bảng roles/permissions/role_permission + pivot `user_role` (nhiều vai trò); seed quyền và 4 vai trò mẫu; Gate theo quyền, Policy chuyển sang quyền; `/me` trả `permissions`; `useCan` ẩn menu, nút và widget; dashboard bỏ trường doanh thu khi thiếu quyền; màn hình **Vai trò & phân quyền** (CRUD, ma trận checkbox); gán **nhiều vai trò** (multi-select) trong Người dùng, bản tối giản nếu R11 chưa làm; xóa cache quyền khi đổi; audit thay đổi quyền và gán vai trò; `admin:create --role=staff --staff-role=a,b` | Test API ma trận: mỗi vai trò mẫu bị 403 đúng chỗ; Quản lý sản phẩm gọi dashboard **không có** trường doanh thu, Kế toán có; admin không bị giới hạn; không xóa được vai trò còn người dùng; nhân viên không tự sửa được `roles.manage`; **user mang 2 vai trò (vd. Quản lý sản phẩm + Kế toán) có đúng hợp quyền** (sửa sản phẩm được và thấy doanh thu); gỡ 1 vai trò thì mất quyền ngay ở request kế tiếp (cache đã xóa); staff không có vai trò nào bị 403 toàn khu admin; audit ghi diff | 4,5 ngày |
| **R7** | Cài đặt | Thông tin cửa hàng, phí ship & ngưỡng miễn phí (checkout dùng), đổi mật khẩu admin | Phiếu giao hàng & checkout lấy từ cài đặt | 1,5 ngày |
| **R8** | Bảng điều khiển | KPI so kỳ, khoảng ngày, **Recharts**, "Việc cần làm" | Lighthouse a11y ≥ 95 | 1,5 ngày |
| **R9** | Catalog phụ | Cây danh mục kéo thả + API reorder; Thương hiệu | CRUD thương hiệu có test | 2 ngày |
| **R10** | Khuyến mãi & đánh giá | Coupon drawer, lượt dùng, nhân bản; đánh giá thẻ, lightbox, bulk, hoàn tác | Test bulk moderate | 1,5 ngày |
| **R11** | Người dùng & nhật ký | Khóa/vai trò (chặn tự khóa), nhật ký có diff | Test chặn tự khóa | 2,5 ngày |
| **R12** | Tìm kiếm toàn cục + Xuất CSV | `/admin/search` + Ctrl+K; **xuất CSV đơn hàng (đã dời về đây)** | < 300 ms; CSV mở đúng tiếng Việt (UTF-8 BOM) | 1,5 ngày |
| **R13** | Hoàn thiện | Rà a11y, tablet, Lighthouse, chunk | Đạt chỉ số mục 1 | 1 ngày |

API bổ sung so với mục 9: `GET /admin/orders/latest-id` 🆕 (thông báo), `GET /admin/orders/{id}/print` hoặc dùng `show` ✅, `GET|PUT /admin/settings` 🆕, `GET /settings/public` 🆕.

Tổng ước lượng: ~28 ngày công (R6 4,5 ngày do hỗ trợ nhiều vai trò).

## 11. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Thay layout làm hỏng test hiện có | Cập nhật test cùng commit; giữ nguyên URL |
| Tiptap/Recharts làm phình bundle | Lazy-load, đo chunk mỗi pha |
| Rich text gây XSS | Sanitize phía server + test payload độc |
| Bulk đổi trạng thái sai | Modal xác nhận, chỉ chuyển hợp lệ, audit log |
| Trình duyệt chặn âm thanh tự phát | Yêu cầu một lần bấm bật âm thanh; luôn có toast |
| Nhân viên vượt quyền / lộ doanh thu | Chặn ở server (Gate theo quyền), bỏ trường nhạy cảm khỏi response, test ma trận 403 |
| Cache quyền cũ sau khi sửa vai trò | Khóa cache theo `role.updated_at`; sửa vai trò thì xóa cache |
| Đổi phí ship ảnh hưởng đơn đang thanh toán | Phí chốt tại thời điểm đặt đơn (đã lưu trong order) |

## 12. Quyết định đã chốt (27/10/2026)
1. **Vai trò:** RBAC theo quyền chi tiết. Quản trị viên có toàn quyền; nhân viên mang vai trò cấu hình được, với 4 vai trò mẫu (Quản lý sản phẩm, Xử lý đơn hàng, Kế toán, Chăm sóc khách hàng). Admin tạo/sửa vai trò ở màn hình Vai trò & phân quyền (mục 4.6).
   - Xem doanh thu tùy vai trò: Kế toán xem được, Quản lý sản phẩm thì không (`dashboard.revenue.view`, server cũng ẩn).
   - Mã giảm giá tách hai quyền xem / quản lý, gán theo vai trò.
   - Kế toán **không** xem nhật ký thao tác. Chăm sóc khách hàng **không** hủy đơn: chỉ xem đơn, sản phẩm, mã giảm giá và kiểm duyệt đánh giá; yêu cầu của khách được chuyển cho bộ phận liên quan.
   - Một nhân viên có thể mang **một hoặc nhiều** vai trò; quyền hiệu lực là hợp quyền các vai trò (pivot `user_role`).
2. **Cài đặt:** Thông tin cửa hàng (tên, SĐT, địa chỉ — in trên phiếu giao hàng/hóa đơn); Cấu hình chung (phí ship mặc định, ngưỡng miễn phí ship); Tài khoản (đổi mật khẩu admin hiện tại).
3. **Thương hiệu:** đổi "Core Điện" → **"Đồ Điện Siêu Xịn"** (làm ở R0).
4. **Trình soạn mô tả:** WYSIWYG, ưu tiên **Tiptap**.
5. **Biểu đồ:** **Recharts**.
6. **In phiếu giao hàng:** làm ngay ở R4; **xuất CSV** dời sang R12.
7. **Thông báo đơn mới:** chỉ báo khi thực sự có đơn mới, kèm âm thanh nhẹ (polling làm cơ chế).
8. **Thiết bị:** tối ưu hoàn toàn cho máy tính, responsive tốt trên máy tính bảng.
9. **Ưu tiên:** Đơn hàng và Sản phẩm trước (sau nền tảng R0–R3), rồi các phần còn lại.
10. **`php artisan admin:create`:** thêm ở R0.

Không còn câu hỏi mở về phân quyền.

## Điều chỉnh trước R4 (27/10/2026): form dạng modal + ảnh sản phẩm tải file

- **Thêm/Sửa dạng modal** (sản phẩm, danh mục, mã giảm giá): `FormModal` dùng Modal R2 (bẫy focus, ESC, Ctrl+S, đóng khi còn thay đổi → hỏi "Bỏ thay đổi?"). Trạng thái trên URL: `?them=1` / `?sua=ID`. Link cũ `/admin/san-pham/moi` và `/admin/san-pham/:id` tự chuyển về danh sách với modal mở. Modal sản phẩm cỡ `xl`, chia tab (Thông tin chung / Biến thể / Ảnh / Thông số & SEO), tab có lỗi được đánh dấu; màn hẹp gần toàn màn hình. Cập nhật trạng thái đơn hàng vẫn ở trang chi tiết.
- **Ảnh sản phẩm**: bỏ ô nhập URL. Chọn nhiều ảnh / kéo thả, xem trước, xóa, sắp xếp (kéo hoặc mũi tên), chọn ảnh chính; kiểm tra JPG/PNG/WebP ≤5MB, tối đa 10 ảnh; hiện tiến độ tải. Lưu sản phẩm xong mới đồng bộ ảnh: xóa → tải lên → lưu thứ tự + ảnh chính.
- **Backend**: `POST /admin/products/{id}/images` (throttle `admin-upload`), `PUT .../images/order`, `DELETE .../images/{media}` — policy `update`, mã hóa lại WebP bỏ EXIF, audit log, xóa file khi xóa ảnh. `product_media` thêm `is_primary`, `file_path`; `thumbnail_url` tự đồng bộ theo ảnh chính. Migration chuyển dữ liệu URL cũ sang media (không mất dữ liệu). Lưu sản phẩm bỏ qua `media`/`thumbnail_url`.
