# Core Ecommerce Base

Nền tảng ecommerce cơ bản gồm **Laravel** (API backend) và **React + Vite** (frontend), chạy qua Docker Compose.

## Cấu trúc

```
core-ecommerce-base/
├── backend/           # Laravel API
├── frontend/          # React (Vite) shop UI
├── docker/            # Nginx và cấu hình Docker
└── docker-compose.yml
```

## Yêu cầu

- Docker & Docker Compose (v2: `docker compose`)
- `openssl` (để tạo `APP_KEY`)

## Chạy từ bản clone mới

```bash
# 0. Clone và chuyển nhánh (ví dụ nhánh Pha 2)
git clone https://github.com/TienHuy-18-09-2005/core-ecommerce-base.git
cd core-ecommerce-base
git checkout pha2-catalog-search

# 1. Tạo file môi trường
cp backend/.env.example backend/.env
cp .env.example .env
KEY="base64:$(openssl rand -base64 32)"
# Điền cùng một giá trị cho cả hai file:
#   .env          : APP_KEY=$KEY, DB_PASSWORD=..., REDIS_PASSWORD=...
#   backend/.env  : APP_KEY=$KEY, DB_PASSWORD=..., REDIS_PASSWORD=...,
#                   ADMIN_EMAIL=..., ADMIN_PASSWORD=..., CUSTOMER_PASSWORD=...
#                   SEED_DEMO_DATA=   (để trống = có dữ liệu demo khi APP_ENV=local)

# 2. Build và khởi động stack (lần đầu container backend tự chạy composer install + migrate)
docker compose up -d --build

# 3. Migrate và seed (tài khoản mẫu + catalog cơ bản + dữ liệu demo nếu được bật)
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force

# 4. Mở trình duyệt
#    http://localhost:5173
```

Lần đầu container frontend chạy `npm ci`, có thể mất 1–2 phút trước khi `http://localhost:5173` trả về trang. Xem tiến độ bằng `docker compose logs -f frontend`.

Muốn làm sạch DB và seed lại từ đầu: `docker compose exec backend php artisan migrate:fresh --seed --force`.

### Dữ liệu demo (`DemoCatalogSeeder`)

- Gồm cây danh mục 3 cấp, 5 thương hiệu và 30 sản phẩm (6 sản phẩm có 2 biến thể), giá từ 15.000đ đến 1.200.000đ. Bộ dữ liệu cố định và chạy lại không bị nhân đôi.
- `SEED_DEMO_DATA` trong `backend/.env`: để trống thì chỉ seed khi `APP_ENV=local` (docker-compose đặt sẵn `local`). Đặt `true`/`false` để bật/tắt ở môi trường không phải production.
- **Không bao giờ seed khi `APP_ENV=production`**, kể cả khi đặt `SEED_DEMO_DATA=true`.
- Mã giảm giá demo (Pha 3): `GIAM10` (giảm 10%, tối đa 50.000đ, đơn từ 200.000đ, 3 lần/khách), `FREESHIP30` (giảm 30.000đ, 100 lượt), `HETHAN` (đã hết hạn — để thử lỗi `COUPON_EXPIRED`).

### Giỏ hàng & thanh toán (Pha 3)

- Trang: `/gio-hang`, `/thanh-toan` (chỉ COD), `/dat-hang-thanh-cong/:code`, `/tra-cuu-don-hang` (mã đơn + SĐT).
- API: `POST /api/checkout` (bắt buộc header `Idempotency-Key`), `POST /api/coupons/check`, `POST /api/orders/lookup`, `GET /api/user/orders/{code}` (chỉ chủ đơn).
- Dọn giỏ khách quá 30 ngày: `php artisan carts:prune-guests` (đã lên lịch chạy hằng ngày; cần `php artisan schedule:work` hoặc cron `schedule:run`).

### Tài khoản (Pha 4)

- Đăng nhập bằng cookie phiên Sanctum (SPA gọi `/sanctum/csrf-cookie` trước), không dùng token. Tài khoản demo lấy từ `backend/.env` (`ADMIN_*`, `CUSTOMER_*`).
- Trang: `/dang-nhap`, `/dang-ky`, `/tai-khoan` (tab: thông tin, lịch sử đơn, sổ địa chỉ, đổi mật khẩu), `/tai-khoan/don-hang/:code` (timeline trạng thái).
- API: `POST /api/auth/login` (5/phút theo email+IP), `POST /api/auth/register` (5/phút), `POST /api/auth/logout`, `GET /api/user`, `PUT /api/user/profile`, `PUT /api/user/password` (cần mật khẩu cũ, 5/phút), `GET /api/user/orders`, CRUD `/api/user/addresses`.
- Khi đăng nhập/đăng ký, giỏ khách được gộp vào giỏ tài khoản **ở server** (kẹp theo tồn kho, bỏ hàng ngừng bán). Response có `cart_adjustments` và FE hiện thông báo; cookie `cart_token` bị xoá.

### Chạy test backend

Test dùng SQLite in-memory (`phpunit.xml`). **Không** chạy `php artisan test` bên trong container `backend` đang chạy: biến môi trường của container (`DB_CONNECTION=mysql`) sẽ ghi đè và `RefreshDatabase` sẽ **xoá DB dev**. Chạy trong container tạm:

```bash
docker run --rm --network none -v "$PWD":/var/www -w /var/www/backend core-ecommerce-base-backend php artisan test
```

### Test đồng thời trên MySQL (checkout / coupon)

Bộ test riêng `backend/tests/Concurrency`, **không** nằm trong `php artisan test` mặc định (SQLite). Script tự tạo 1 container MySQL tạm (dữ liệu trên tmpfs, mạng riêng), fork nhiều tiến trình PHP cùng đặt hàng một lúc, rồi xoá container khi xong. Không đụng DB dev; test tự từ chối chạy nếu DB không phải `ecom_concurrency_test`.

```bash
./scripts/concurrency-test.sh            # hoặc: DOCKER="sudo docker" ./scripts/concurrency-test.sh
```

Kiểm tra: 10 người tranh 1 sản phẩm cuối → đúng 1 đơn; kho không bao giờ âm; coupon `usage_limit=3` với 12 người → `used_count` = 3; 6 request cùng `Idempotency-Key` → 1 đơn.

### Đổi nhánh

Sau khi `git checkout` sang nhánh khác, cần **rebuild hoặc restart container frontend** (và chạy lại migrate nếu có migration mới). Lý do: `node_modules` nằm trong volume riêng và Vite có thể giữ cache cũ.

```bash
docker compose up -d --build
docker compose restart frontend
docker compose exec backend php artisan migrate --force
```

Nếu `package-lock.json` thay đổi mà vẫn lỗi: `docker compose down && docker volume rm core-ecommerce-base_frontend_node_modules && docker compose up -d --build`.

### Cổng dịch vụ

| Dịch vụ     | URL / cổng            |
|-------------|-----------------------|
| Frontend    | http://localhost:5173 |
| API (Nginx) | http://localhost:8000 |
| MySQL, Redis | Chỉ mở trong mạng Docker, không publish ra máy host |

### Dừng stack

```bash
docker compose down
```

## Tài khoản: quên mật khẩu, xác thực email, Mailpit

**Email dev (Mailpit).** `docker compose up -d` chạy thêm `mailpit`: SMTP `mailpit:1025` trong mạng compose, giao diện
**http://127.0.0.1:8025** (cả hai cổng chỉ bind `127.0.0.1`). Backend gửi qua `MAIL_MAILER=smtp`, `MAIL_HOST=mailpit`,
`MAIL_PORT=1025` (xem `backend/.env.example`). Không có email nào ra Internet. Mọi email bằng tiếng Việt. Link trong email trỏ về
SPA theo `FRONTEND_URL` (mặc định `http://localhost:5173`), không trỏ về API.

**Quên / đặt lại mật khẩu** (password broker của Laravel, token hết hạn sau 60 phút):
- `POST /api/auth/forgot-password {email}` luôn trả **cùng một** thông điệp chung, dù email có tồn tại hay không (chống dò email).
  Giới hạn 5 lần/phút theo email+IP.
- Email chứa `FRONTEND_URL/dat-lai-mat-khau?token=…&email=…`, trang `/dat-lai-mat-khau` gọi
  `POST /api/auth/reset-password {token,email,password,password_confirmation}`. Quy tắc mật khẩu giống lúc đăng ký. Token
  dùng một lần (`422 RESET_TOKEN_INVALID` khi sai, hết hạn hoặc đã dùng). Sau khi đặt lại, mọi phiên đăng nhập khác bị huỷ:
  Sanctum `AuthenticateSession` so hash mật khẩu, `remember_token` được xoay vòng, token API bị xoá.
- Trang `/quen-mat-khau`. Trang đăng nhập có link "Quên mật khẩu?".

**Xác thực email** (`User implements MustVerifyEmail`):
- Đăng ký xong, hệ thống gửi email chứa link `FRONTEND_URL/xac-thuc-email?id&hash&expires&signature` (URL ký, hết hạn sau 60 phút).
  Trang này gọi `GET /api/email/verify/{id}/{hash}?expires&signature`, không cần đăng nhập, nên mở trên máy khác vẫn được.
  Link sai hoặc hết hạn trả `403 VERIFICATION_LINK_INVALID`.
- Gửi lại: `POST /api/email/verification-notification` (cần đăng nhập, tối đa 3 lần/phút). Banner vàng trong shop có nút
  "Gửi lại email".
- Tài khoản demo do seeder tạo (admin, customer, reviewer) đã được xác thực sẵn.

**Chính sách khi chưa xác thực email:**

| Hành động | Chưa xác thực |
|---|---|
| Xem sản phẩm, giỏ hàng, đăng nhập/đăng xuất, trang tài khoản | ✅ được |
| Đặt hàng **khi đang đăng nhập** | ❌ `403 EMAIL_NOT_VERIFIED`, nút đặt hàng bị khoá kèm hướng dẫn |
| Đặt hàng **với tư cách khách** (không đăng nhập) | ✅ vẫn được như cũ |

Lý do: đơn gắn với tài khoản phải thuộc về chủ thật của email (lịch sử đơn, thông báo). Khách vãng lai thì không gắn tài khoản.

## Đánh giá sản phẩm (Pha 5)

**Ai được đánh giá:** chỉ tài khoản đã **xác thực email** và có ít nhất một đơn **đã giao** (`status = delivered`) chứa sản phẩm đó. Mỗi tài khoản 1 đánh giá / sản phẩm (unique `product_id, user_id`), có thể sửa hoặc xoá. Đánh giá của người mua hợp lệ được **hiển thị ngay** (`is_approved = true`); admin có thể ẩn/hiện hoặc xoá.

| Endpoint | Quyền | Throttle |
|---|---|---|
| `GET /api/products/{slug}/reviews?rating=&page=&per_page=` | công khai, chỉ review đã duyệt + phân bổ 5★…1★ | `public-read` 120/phút |
| `GET /api/products/{slug}/reviews/eligibility` | đăng nhập | `account` |
| `POST /api/products/{slug}/reviews` (multipart) | người mua đã nhận hàng | `review-write` 5/phút + 20/ngày |
| `PUT /api/reviews/{id}` (multipart: POST + `_method=PUT`) | chủ đánh giá | `review-write` |
| `DELETE /api/reviews/{id}` | chủ đánh giá hoặc admin | `review-write` |
| `PATCH /api/admin/reviews/{id}` `{is_approved}` | admin | `admin` |

Mã lỗi: `REVIEW_NOT_PURCHASED` (403), `EMAIL_NOT_VERIFIED` (403), `REVIEW_ALREADY_EXISTS` (409); sửa/xoá review của người khác → 404.

- Nội dung: văn bản thuần ≤ 2000 ký tự, FE render bằng text node (không HTML). Tên người viết hiển thị rút gọn ("N. V. An"), không lộ email.
- Ảnh: tối đa 3, chỉ JPEG/PNG/WebP, **mọi ảnh được mã hoá lại bằng GD** (xoay theo EXIF Orientation rồi bỏ toàn bộ EXIF/GPS; ảnh không mã hoá lại được → 422, không lưu file gốc) (kiểm cả đuôi lẫn MIME thật), ≤ 2MB, không nhận SVG; lưu ở disk `public` với tên ngẫu nhiên 40 ký tự (`storage/app/public/reviews/YYYY/MM/`). Container backend tự chạy `storage:link`; Vite proxy `/storage` sang nginx.
- Seeder demo: nếu có tài khoản khách (`CUSTOMER_EMAIL`), tạo đơn đã giao `DEMO-DELIVERED-1` gồm sản phẩm demo số 1 và 2 → đăng nhập bằng tài khoản đó là thử viết đánh giá được.

## Ngôn ngữ

Backend chạy `APP_LOCALE=vi` (fallback cũng là `vi`). Bản dịch nằm ở `backend/lang/vi/` (`validation.php` đủ mọi rule, gồm các
rule Password, kèm tên trường tiếng Việt; `auth.php`, `passwords.php`, `pagination.php`) và `backend/lang/vi.json`. Các lỗi HTTP
chung 401/403/404/405/419/429/500 đều trả thông điệp tiếng Việt chuẩn. Mã lỗi (`code`) giữ nguyên để frontend xử lý.

## Ghi chú

- **Không commit** file `.env` — chỉ dùng `.env.example`.
- `node_modules` và `vendor` được bỏ qua bởi `.gitignore`.
