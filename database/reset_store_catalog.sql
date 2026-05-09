-- Chỉ dùng khi bạn muốn reset catalog BẰNG TAY (psql), tách khỏi import.
-- Khuyến nghị: dùng Python —reset-catalog —confirm-reset N (một transaction với import).
--
-- Sửa số 2 thành store_id của bạn ở cả hai DELETE.
--
BEGIN;

DELETE FROM products WHERE store_id = 2;
DELETE FROM categories WHERE store_id = 2;

-- Uncomment để xóa luôn promo của store:
-- DELETE FROM promo_codes WHERE store_id = 2;

COMMIT;
