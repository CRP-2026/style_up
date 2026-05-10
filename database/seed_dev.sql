-- Dev seed — chạy sau init_database.sql (Docker: docker-entrypoint-initdb.d/02-...)
-- Jewelry Shop
-- Tài khoản demo store 1: email demo.jewelry@gmail.com / mật khẩu: demo123456
-- role=admin cho user demo: chỉ admin mới gọi PATCH /admin/users/{id}/status (môi trường dev).

INSERT INTO stores (id, name, slug)
VALUES
  (1, 'Phụ kiện trang sức', 'jewelry')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

SELECT setval(pg_get_serial_sequence('stores', 'id'), (SELECT COALESCE(MAX(id), 1) FROM stores));

-- Payment methods (bắt buộc cho đặt hàng FK)
INSERT INTO payment_methods (store_id, code, title, subtitle, icon, enabled, position) VALUES
  (1, 'card', 'Credit / Debit Card', 'Visa, Mastercard, JCB', 'card-outline', TRUE, 0),
  (1, 'cod', 'Cash on Delivery', 'Pay when your parcel arrives', 'cash-outline', TRUE, 1),
  (1, 'wallet', 'E-wallet', 'Momo, ZaloPay, VNPay', 'wallet-outline', TRUE, 2)
ON CONFLICT (store_id, code) DO NOTHING;

INSERT INTO categories (store_id, id, label, slug, image) VALUES
  (1, 'accessories', 'Accessories', 'accessories', 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=400&q=80'),
  (1, 'rings', 'Rings', 'rings', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80'),
  (1, 'earrings', 'Earrings', 'earrings', 'https://inayas.in/wp-content/uploads/2025/05/IMG_20250416_124252036_HDR.jpg?x52606'),
  (1, 'necklaces', 'Necklaces', 'necklaces', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80'),
  (1, 'bracelets', 'Bracelets', 'bracelets', 'https://images.unsplash.com/photo-1515562141207-7a18b5ce7142?w=400&q=80')
ON CONFLICT (store_id, id) DO UPDATE SET image = EXCLUDED.image;

-- bcrypt hash của "demo123456" (tạo bằng bcrypt.gensalt)
INSERT INTO users (id, store_id, email, password_hash, name, phone, role, is_active)
VALUES (
  'user-demo-jewelry',
  1,
  'demo.jewelry@gmail.com',
  '$2b$12$Iq0Bu1ky22u.WOHdNViKoegqg8IFGvw9HMlKjzn.rO6W2Newjxarq',
  'Vo Tan Duc',
  '0901123456',
  'admin',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

INSERT INTO addresses (id, store_id, user_id, name, phone, address, city, is_default)
VALUES (
  'addr-demo-1',
  1,
  'user-demo-jewelry',
  'Vo Tan Duc',
  '0901123456',
  '65 Nguyen Trai, Ward 7, District 5',
  'Ho Chi Minh City',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- --- Products store 1 (jewelry) ---
INSERT INTO products (
  store_id, id, category_id, name, slug, description, short_description, default_image,
  base_price, discount_label, discount_percent, rating_avg, review_count,
  jewelry_type, material, karat, gemstone, finish, occasion, is_active
) VALUES (
  1,
  'jewelry-set-01',
  'accessories',
  'Pearl & Gold Jewelry Set',
  'pearl-gold-jewelry-set',
  'Elegant jewelry set with two selectable finishes for daily wear and gifting.',
  'Pearl & gold finishes for gifting.',
  'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=60',
  1299000,
  '10% off',
  10,
  4.8,
  248,
  'set',
  'gold',
  '14K',
  'pearl',
  'polished',
  'gift',
  TRUE
),
(
  1,
  'jewelry-ring-01',
  'rings',
  'Minimal Ring Collection',
  'minimal-ring-collection',
  'A lightweight ring that ships in a single default size variant.',
  'Single default size variant.',
  'https://images.unsplash.com/photo-1614179924047-79a1b0845c9f?auto=format&fit=crop&w=900&q=60',
  599000,
  NULL,
  NULL,
  4.6,
  109,
  'ring',
  'silver',
  '925',
  NULL,
  'polished',
  'daily',
  TRUE
),
(
  1,
  'jewelry-earring-01',
  'earrings',
  'Crystal Drop Earrings',
  'crystal-drop-earrings',
  'A versatile earring set with three color finishes and stock per variant.',
  'Three color finishes.',
  'https://images.unsplash.com/photo-1617038220319-7f80d8f9b4c5?auto=format&fit=crop&w=900&q=60',
  789000,
  'Best seller',
  NULL,
  4.7,
  87,
  'earring',
  'gold',
  NULL,
  'crystal',
  'polished',
  'daily',
  TRUE
)
ON CONFLICT (store_id, id) DO UPDATE SET name = EXCLUDED.name;

UPDATE products SET total_stock = 19 WHERE store_id = 1 AND id = 'jewelry-set-01';
UPDATE products SET total_stock = 25 WHERE store_id = 1 AND id = 'jewelry-ring-01';
UPDATE products SET total_stock = 32 WHERE store_id = 1 AND id = 'jewelry-earring-01';

INSERT INTO product_variants (store_id, id, product_id, sku, color, price, stock, image, position) VALUES
  (1, 'jewelry-set-01-gold', 'jewelry-set-01', 'JWL-SET-01-GOLD', 'Gold', 1299000, 12,
   'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=60', 0),
  (1, 'jewelry-set-01-silver', 'jewelry-set-01', 'JWL-SET-01-SLV', 'Silver', 1199000, 7,
   'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=60', 1),
  (1, 'jewelry-ring-01-default', 'jewelry-ring-01', 'JWL-RING-01-DEF', NULL, 599000, 25,
   'https://images.unsplash.com/photo-1614179924047-79a1b0845c9f?auto=format&fit=crop&w=900&q=60', 0),
  (1, 'jewelry-earring-01-gold', 'jewelry-earring-01', 'JWL-EAR-01-GOLD', 'Gold', 789000, 18,
   'https://images.unsplash.com/photo-1617038220319-7f80d8f9b4c5?auto=format&fit=crop&w=900&q=60', 0),
  (1, 'jewelry-earring-01-rose', 'jewelry-earring-01', 'JWL-EAR-01-ROSE', 'Rose Gold', 829000, 9,
   'https://images.unsplash.com/photo-1617038220319-7f80d8f9b4c5?auto=format&fit=crop&w=900&q=60', 1),
  (1, 'jewelry-earring-01-silver', 'jewelry-earring-01', 'JWL-EAR-01-SLV', 'Silver', 759000, 5,
   'https://images.unsplash.com/photo-1617038220319-7f80d8f9b4c5?auto=format&fit=crop&w=900&q=60', 2)
ON CONFLICT (store_id, id) DO NOTHING;

INSERT INTO product_images (id, store_id, product_id, url, position) VALUES
  ('img-jwl-set-0', 1, 'jewelry-set-01', 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=60', 0),
  ('img-jwl-set-1', 1, 'jewelry-set-01', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=60', 1)
ON CONFLICT (id) DO NOTHING;

-- --- Additional 16 Products (Total 19) ---
INSERT INTO products (
  store_id, id, category_id, name, slug, description, short_description, default_image,
  base_price, rating_avg, review_count, jewelry_type, finish, occasion, is_active, total_stock
) VALUES
(1, 'prod-001', 'rings', 'Diamond Solitaire Ring', 'diamond-solitaire-ring', 'A classic diamond solitaire ring in 18K white gold.', 'A classic diamond solitaire ring.', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&q=80', 8990000, 4.9, 120, 'ring', 'polished', 'daily', TRUE, 15),
(1, 'prod-002', 'rings', 'Vintage Emerald Ring', 'vintage-emerald-ring', 'Vintage style emerald ring with diamond accents.', 'Vintage style emerald ring.', 'https://images.unsplash.com/photo-1614179924047-79a1b0845c9f?w=900&q=80', 5500000, 4.7, 85, 'ring', 'polished', 'daily', TRUE, 8),
(1, 'prod-003', 'rings', 'Sapphire Halo Ring', 'sapphire-halo-ring', 'Stunning sapphire halo ring perfect for engagements.', 'Stunning sapphire halo ring.', 'https://images.unsplash.com/photo-1596945037924-f72cb9a6d97f?w=900&q=80', 7200000, 4.8, 200, 'ring', 'polished', 'daily', TRUE, 12),
(1, 'prod-004', 'rings', 'Rose Gold Promise Ring', 'rose-gold-promise-ring', 'Delicate rose gold promise ring.', 'Delicate rose gold promise ring.', 'https://images.unsplash.com/photo-1515562141207-7a18b5ce7142?w=900&q=80', 2500000, 4.5, 45, 'ring', 'polished', 'daily', TRUE, 20),

(1, 'prod-005', 'earrings', 'Pearl Drop Earrings', 'pearl-drop-earrings', 'Elegant freshwater pearl drop earrings.', 'Elegant freshwater pearl drop earrings.', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&q=80', 1200000, 4.6, 60, 'earring', 'polished', 'daily', TRUE, 30),
(1, 'prod-006', 'earrings', 'Gold Hoop Earrings', 'gold-hoop-earrings', 'Classic 14K gold hoop earrings.', 'Classic 14K gold hoop earrings.', 'https://images.unsplash.com/photo-1617038220319-7f80d8f9b4c5?w=900&q=80', 1800000, 4.8, 150, 'earring', 'polished', 'daily', TRUE, 25),
(1, 'prod-007', 'earrings', 'Diamond Studs', 'diamond-studs', 'Brilliant cut diamond stud earrings.', 'Brilliant cut diamond stud earrings.', 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=900&q=80', 4500000, 4.9, 300, 'earring', 'polished', 'daily', TRUE, 10),
(1, 'prod-008', 'earrings', 'Silver Chandelier Earrings', 'silver-chandelier-earrings', 'Intricate silver chandelier earrings for special occasions.', 'Intricate silver chandelier earrings.', 'https://images.unsplash.com/photo-1588444650733-d0767b753cb8?w=900&q=80', 950000, 4.4, 35, 'earring', 'polished', 'daily', TRUE, 15),

(1, 'prod-009', 'necklaces', 'Diamond Tennis Necklace', 'diamond-tennis-necklace', 'Luxurious diamond tennis necklace.', 'Luxurious diamond tennis necklace.', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80', 15000000, 5.0, 10, 'necklace', 'polished', 'daily', TRUE, 5),
(1, 'prod-010', 'necklaces', 'Gold Chain Necklace', 'gold-chain-necklace', 'Simple and elegant 18K gold chain.', 'Simple and elegant 18K gold chain.', 'https://images.unsplash.com/photo-1611591437281-460bfbe157ad?w=900&q=80', 3200000, 4.7, 90, 'necklace', 'polished', 'daily', TRUE, 40),
(1, 'prod-011', 'necklaces', 'Silver Heart Pendant', 'silver-heart-pendant', 'Sterling silver necklace with a heart pendant.', 'Sterling silver necklace with heart.', 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=900&q=80', 850000, 4.5, 110, 'necklace', 'polished', 'daily', TRUE, 50),
(1, 'prod-012', 'necklaces', 'Pearl Strand Necklace', 'pearl-strand-necklace', 'Classic Akoya pearl strand necklace.', 'Classic Akoya pearl strand necklace.', 'https://images.unsplash.com/photo-1515562141207-7a18b5ce7142?w=900&q=80', 5800000, 4.8, 75, 'necklace', 'polished', 'daily', TRUE, 12),

(1, 'prod-013', 'bracelets', 'Silver Charm Bracelet', 'silver-charm-bracelet', 'Customizable silver charm bracelet.', 'Customizable silver charm bracelet.', 'https://images.unsplash.com/photo-1611591437281-460bfbe157ad?w=900&q=80', 1100000, 4.6, 200, 'bracelet', 'polished', 'daily', TRUE, 30),
(1, 'prod-014', 'bracelets', 'Gold Bangle', 'gold-bangle', 'Sleek 14K gold bangle bracelet.', 'Sleek 14K gold bangle bracelet.', 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=900&q=80', 2800000, 4.7, 130, 'bracelet', 'polished', 'daily', TRUE, 22),
(1, 'prod-015', 'bracelets', 'Diamond Tennis Bracelet', 'diamond-tennis-bracelet', 'Stunning diamond tennis bracelet.', 'Stunning diamond tennis bracelet.', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80', 9500000, 4.9, 40, 'bracelet', 'polished', 'daily', TRUE, 7),
(1, 'prod-016', 'bracelets', 'Leather Wrap Bracelet', 'leather-wrap-bracelet', 'Casual leather wrap bracelet with silver accents.', 'Casual leather wrap bracelet.', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&q=80', 450000, 4.3, 80, 'bracelet', 'polished', 'daily', TRUE, 60)
ON CONFLICT (store_id, id) DO NOTHING;

INSERT INTO product_variants (store_id, id, product_id, sku, color, price, stock, image, position) VALUES
(1, 'prod-001-def', 'prod-001', 'SKU-001', NULL, 8990000, 15, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&q=80', 0),
(1, 'prod-002-def', 'prod-002', 'SKU-002', NULL, 5500000, 8, 'https://images.unsplash.com/photo-1614179924047-79a1b0845c9f?w=900&q=80', 0),
(1, 'prod-003-def', 'prod-003', 'SKU-003', NULL, 7200000, 12, 'https://images.unsplash.com/photo-1596945037924-f72cb9a6d97f?w=900&q=80', 0),
(1, 'prod-004-def', 'prod-004', 'SKU-004', NULL, 2500000, 20, 'https://images.unsplash.com/photo-1515562141207-7a18b5ce7142?w=900&q=80', 0),
(1, 'prod-005-def', 'prod-005', 'SKU-005', NULL, 1200000, 30, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&q=80', 0),
(1, 'prod-006-def', 'prod-006', 'SKU-006', NULL, 1800000, 25, 'https://images.unsplash.com/photo-1617038220319-7f80d8f9b4c5?w=900&q=80', 0),
(1, 'prod-007-def', 'prod-007', 'SKU-007', NULL, 4500000, 10, 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=900&q=80', 0),
(1, 'prod-008-def', 'prod-008', 'SKU-008', NULL, 950000, 15, 'https://images.unsplash.com/photo-1588444650733-d0767b753cb8?w=900&q=80', 0),
(1, 'prod-009-def', 'prod-009', 'SKU-009', NULL, 15000000, 5, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80', 0),
(1, 'prod-010-def', 'prod-010', 'SKU-010', NULL, 3200000, 40, 'https://images.unsplash.com/photo-1611591437281-460bfbe157ad?w=900&q=80', 0),
(1, 'prod-011-def', 'prod-011', 'SKU-011', NULL, 850000, 50, 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=900&q=80', 0),
(1, 'prod-012-def', 'prod-012', 'SKU-012', NULL, 5800000, 12, 'https://images.unsplash.com/photo-1515562141207-7a18b5ce7142?w=900&q=80', 0),
(1, 'prod-013-def', 'prod-013', 'SKU-013', NULL, 1100000, 30, 'https://images.unsplash.com/photo-1611591437281-460bfbe157ad?w=900&q=80', 0),
(1, 'prod-014-def', 'prod-014', 'SKU-014', NULL, 2800000, 22, 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=900&q=80', 0),
(1, 'prod-015-def', 'prod-015', 'SKU-015', NULL, 9500000, 7, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80', 0),
(1, 'prod-016-def', 'prod-016', 'SKU-016', NULL, 450000, 60, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&q=80', 0)
ON CONFLICT (store_id, id) DO NOTHING;
