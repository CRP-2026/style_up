# Jewelry Shop API (FastAPI Backend)

Backend FastAPI cho Jewelry Shop (PostgreSQL, multi-store via `X-Store-Id`).

## API Base

- Base path: `/api/v1`
- Health: `GET /api/v1/health`
- Root: `GET /`

## Main Endpoints

- Catalog
  - `GET /api/v1/categories`
  - `GET /api/v1/products?category_id=&min_price=&max_price=&search=&limit=&offset=`
  - `GET /api/v1/products/{product_id}`
- Auth
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout` (Bearer)
- Users
  - `GET /api/v1/users/me` (Bearer)
  - `PATCH /api/v1/users/me` (Bearer)
- Addresses
  - `GET /api/v1/addresses/` (Bearer)
  - `GET /api/v1/addresses/{address_id}` (Bearer)
  - `POST /api/v1/addresses/` (Bearer)
  - `PUT /api/v1/addresses/{address_id}` (Bearer)
  - `DELETE /api/v1/addresses/{address_id}` (Bearer)
- Orders
  - `GET /api/v1/orders/` (Bearer)
  - `GET /api/v1/orders/{order_id}` (Bearer)
  - `POST /api/v1/orders/` (Bearer)
- Admin
  - `PATCH /api/v1/admin/users/{user_id}/status` (Bearer, role `admin`)

## Auth / Roles

- Header chuẩn cho route protected:
  - `Authorization: Bearer <token>`
  - `X-Store-Id: <int>` (optional, default `1`)
- Role hiện tại:
  - `user`
  - `staff`
  - `admin`
- Chỉ `admin` mới được đổi `is_active` của user khác.
- User `is_active = false` không đăng nhập được (`account_inactive`).
- Logout dùng cơ chế revoke access token qua bảng `revoked_access_tokens`.

## Run With Docker (recommended)

```bash
docker compose up -d --build
```

Compose sẽ chạy:
- API: `http://localhost:8000`
- Postgres: `localhost:5432`

Schema + seed chỉ auto-run khi volume DB rỗng, từ:
- `database/init_database.sql`
- `database/seed_dev.sql`

Reset DB dev:

```bash
docker compose down -v
docker compose up -d --build
```

## Run Local (venv)

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Environment

`native-e-commerce-be/.env` cần tối thiểu:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`
- `SECRET_KEY`
- `ALGORITHM` (default `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`

## DB Migrations

Hiện dùng SQL migration thủ công trong `database/migrations/`.

Nếu DB cũ bị lệch schema (ví dụ thiếu `users.is_active`), chạy:

```bash
psql "$DATABASE_URL" -f database/migrations/apply_auth_migrations.sql
```

Xem thêm hướng dẫn trong `database/migrations/README.md`.

## Seed Demo Account

Từ `database/seed_dev.sql`:

- email: `demo.jewelry@gmail.com`
- password: `demo123456`
- store: `1`