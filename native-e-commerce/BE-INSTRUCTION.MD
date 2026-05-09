# BE-INSTRUCTION (Current)

Tài liệu contract backend hiện tại mà FE `my-app` đang dùng thật.

## Base URL + Headers

- Base URL: `/api/v1`
- FE env:
  - `EXPO_PUBLIC_API_URL` (ví dụ `http://127.0.0.1:8000/api/v1`)
  - `EXPO_PUBLIC_STORE_ID` (default `1`)
- Header chuẩn:
  - `X-Store-Id: <store-id>`
  - `Authorization: Bearer <token>` (route protected)

## Error Format

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": {}
  }
}
```

## API đang dùng trong FE

### Catalog

- `GET /categories`
- `GET /products`
  - query: `category_id`, `min_price`, `max_price`, `search`, `limit`, `offset`
- `GET /products/{product_id}`

### Auth

- `POST /auth/login` → `{ access_token, token_type }`
- `POST /auth/register` → `{ access_token, token_type }`
- `POST /auth/logout` (Bearer) → revoke token

### Users

- `GET /users/me` (Bearer)
- `PATCH /users/me` (Bearer)

User profile FE đang dùng:

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string | null",
  "avatar": "string | null",
  "bio": "string | null",
  "is_active": true,
  "role": "user | staff | admin"
}
```

### Addresses

- `GET /addresses/`
- `GET /addresses/{address_id}`
- `POST /addresses/`
- `PUT /addresses/{address_id}`
- `DELETE /addresses/{address_id}`

### Orders

- `GET /orders/` (optional `?status=...`)
- `GET /orders/{order_id}`
- `POST /orders/`

Body tạo order FE gửi:

```json
{
  "items": [
    { "productId": "prod-1", "variantId": "prod-1-gold", "quantity": 1 }
  ],
  "shippingAddressId": "addr-1",
  "paymentMethod": "card",
  "shippingFee": "30000",
  "discountTotal": "0"
}
```

## Role / Account Rules (BE)

- Role: `user`, `staff`, `admin`
- Chỉ `admin` được gọi `PATCH /admin/users/{user_id}/status`
- `is_active = false`:
  - không login được
  - route protected trả `account_inactive`

## FE Integration Notes

- API core:
  - `lib/api/client.ts`, `lib/api/catalog.ts`, `lib/api/auth.ts`, `lib/api/users.ts`, `lib/api/orders.ts`, `lib/api/addresses.ts`
- Session:
  - `lib/auth/session.ts` (`hydrateSession`, `afterAuthLogin`, `logoutSession`)
- Token:
  - `lib/api/token.ts` (`ecc_access_token`)
- i18n lỗi/empty:
  - `lib/i18n/*`

## Smoke Test

- API quick check:
  - `npm run smoke:api`
- Manual flow:
  - xem `my-app/SMOKE_TEST.md`

## DB Schema Sync Notes

Nếu backend báo lỗi kiểu `column users.is_active does not exist`, DB đang cũ hơn code.

Chạy migration gộp:

```bash
psql "$DATABASE_URL" -f database/migrations/apply_auth_migrations.sql
```

Với Docker Compose, nhớ dùng đúng tên DB runtime (`POSTGRES_DB`).
