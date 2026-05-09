# Migrations (manual SQL)

Nếu backend báo lỗi kiểu **`column users.is_active does not exist`** hoặc **`role` / `revoked_access_tokens`**, database đang là **bản cũ** so với `init_database.sql` hiện tại.

## Cách 1 — Một file (khuyến nghị)

Chạy toàn bộ:

```bash
psql "$DATABASE_URL" -f database/migrations/apply_auth_migrations.sql
```

Hoặc với Docker Compose (từ thư mục `native-e-commerce-be`). **Tên database** phải trùng `POSTGRES_DB` / phần cuối của `DATABASE_URL` (ví dụ `ecommerce`, hoặc như `.env` của bạn — kiểm tra: `docker compose exec db psql -U postgres -c "\\l"`).

```bash
docker compose exec -T db psql -U postgres -d YOUR_DB_NAME -f - < ../database/migrations/apply_auth_migrations.sql
```

Trên PowerShell (Windows), ví dụ DB tên `style_up`:

```powershell
Get-Content ..\database\migrations\apply_auth_migrations.sql -Raw | docker compose exec -T db psql -U postgres -d style_up
```

## Cách 2 — Từng bước

1. `0002_auth_user_status_revocations.sql` — `is_active`, `is_staff`, `revoked_access_tokens`
2. `0003_user_role_enum.sql` — enum `user_role`, cột `role`, bỏ `is_staff`
3. `0004_phase1_integrity_and_shoes.sql` — CHECK constraints (oversell guard), index trạng thái đơn, seed / cleanup cho migration jewelry. **Bắt buộc** áp dụng trước khi demo store trang sức.

PowerShell apply nhanh:

```powershell
Get-Content database\migrations\0004_phase1_integrity_and_shoes.sql -Raw | docker compose -f native-e-commerce-be\docker-compose.yml exec -T db psql -U postgres -d style_up
```

## Cách 3 — Dev, chấp nhận xóa dữ liệu

```bash
docker compose down -v
docker compose up -d --build
```

Volume Postgres mới sẽ chạy lại `init_database.sql` + `seed_dev.sql`.
