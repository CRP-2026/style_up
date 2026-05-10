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
