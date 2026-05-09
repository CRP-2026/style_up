-- 0004 Phase 1 — Data integrity hardening + jewelry-store foundation
-- Idempotent: dùng IF NOT EXISTS / DO blocks. An toàn để chạy nhiều lần.
-- Áp dụng:
--   docker compose exec -T db psql -U postgres -d ${POSTGRES_DB} -f /docker-entrypoint-initdb.d/migrations/0004_phase1_integrity_and_shoes.sql
-- Hoặc copy file vào container rồi `psql ... -f ...`.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) CHECK constraints để chặn dữ liệu xấu (oversell, giá âm, qty <= 0)
-- ---------------------------------------------------------------------------

-- products
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_total_stock_nonneg'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_total_stock_nonneg CHECK (total_stock >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_base_price_nonneg'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_base_price_nonneg CHECK (base_price >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_sale_price_nonneg'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_sale_price_nonneg CHECK (sale_price IS NULL OR sale_price >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_compare_at_price_nonneg'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_compare_at_price_nonneg
      CHECK (compare_at_price IS NULL OR compare_at_price >= 0);
  END IF;
END $$;

-- product_variants
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pv_stock_nonneg'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT pv_stock_nonneg CHECK (stock >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pv_price_nonneg'
  ) THEN
    ALTER TABLE product_variants
      ADD CONSTRAINT pv_price_nonneg CHECK (price IS NULL OR price >= 0);
  END IF;
END $$;

-- order_items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oi_quantity_positive'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT oi_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oi_unit_price_nonneg'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT oi_unit_price_nonneg CHECK (unit_price >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oi_line_total_nonneg'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT oi_line_total_nonneg CHECK (line_total >= 0);
  END IF;
END $$;

-- orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_subtotal_nonneg'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_subtotal_nonneg CHECK (subtotal >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_shipping_fee_nonneg'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_shipping_fee_nonneg CHECK (shipping_fee >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_total_nonneg'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_discount_total_nonneg CHECK (discount_total >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_nonneg'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_total_nonneg CHECK (total >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Indexes tối ưu cho lifecycle đơn hàng (admin/orders list)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_store_status_placed
  ON orders (store_id, status, placed_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_timelines_store_order_pos2
  ON order_timelines (store_id, order_id, position);

-- ---------------------------------------------------------------------------
-- 3) Bổ sung jewelry categories + sample data để store 1 đủ demo
-- ---------------------------------------------------------------------------
INSERT INTO categories (store_id, id, label, slug) VALUES
  (1, 'necklaces', 'Necklaces', 'necklaces'),
  (1, 'bracelets', 'Bracelets', 'bracelets')
ON CONFLICT (store_id, id) DO NOTHING;

-- Jewelry sample data for store 1
-- Note: shoes store data has been removed as part of jewelry-only migration
