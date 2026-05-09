# Smoke test — luồng chính

Kiểm tra nhanh sau khi backend (`native-e-commerce-be`) và app Expo đang chạy. Env app: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_STORE_ID`.

## A. API-only (Node 18+)

Từ thư mục `my-app`:

```bash
npm run smoke:api
```

Hoặc:

```bash
API_URL=http://127.0.0.1:8000/api/v1 SMOKE_EMAIL=demo.jewelry@gmail.com SMOKE_PASSWORD=demo123456 node scripts/smoke-api-check.mjs
```

Kỳ vọng: `OK: login → users/me → addresses → logout`.

## B. Trên thiết bị / emulator (manual)

1. **Đăng nhập** — Login với tài khoản seed (email/password trong `database/seed_dev.sql`, ví dụ `demo.jewelry@gmail.com` / `demo123456`).
2. **Địa chỉ** — Vào sổ địa chỉ: thêm / sửa / xóa (nếu có) một địa chỉ; kiểm tra danh sách cập nhật.
3. **Đặt hàng** — Thêm sản phẩm vào giỏ → Checkout → chọn địa chỉ & thanh toán → đặt hàng thành công.
4. **Đơn hàng** — Tab Order: thấy đơn vừa tạo; mở chi tiết khớp mã/tổng tiền.
5. **Account** — Tab Account: thấy tên/email/phone từ API (không còn toàn placeholder); **Đăng xuất** → quay Login; gọi lại API với token cũ phải fail (revoked).

## Ngôn ngữ UI

Đặt locale thiết bị **Tiếng Việt** hoặc **English** và lặp bước 1–5; thông báo lỗi / empty state (giỏ hàng, đơn hàng, checkout) phải khớp ngôn ngữ.
