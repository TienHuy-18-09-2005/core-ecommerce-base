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

## Ghi chú

- **Không commit** file `.env` — chỉ dùng `.env.example`.
- `node_modules` và `vendor` được bỏ qua bởi `.gitignore`.
