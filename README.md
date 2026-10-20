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

- Docker & Docker Compose
- File `backend/.env` (copy từ `backend/.env.example` nếu chưa có)

## Chạy bằng Docker

```bash
# 1. Tạo file môi trường backend (nếu chưa có)
cp backend/.env.example backend/.env

# 2. Khởi động toàn bộ stack
docker compose up -d --build

# 3. Cài dependency & chuẩn bị Laravel (lần đầu)
docker compose exec backend composer install
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
```

### Cổng dịch vụ

| Dịch vụ   | URL / cổng              |
|-----------|-------------------------|
| API (Nginx) | http://localhost:8000 |
| Frontend  | http://localhost:5173   |
| MySQL     | `localhost:33066`       |
| Redis     | `localhost:63790`       |

### Dừng stack

```bash
docker compose down
```

## Ghi chú

- **Không commit** file `.env` — chỉ dùng `.env.example`.
- `node_modules` và `vendor` được bỏ qua bởi `.gitignore`.
