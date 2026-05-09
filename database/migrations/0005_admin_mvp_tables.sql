BEGIN;

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id            TEXT PRIMARY KEY,
  store_id      INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  variant_id    TEXT NOT NULL,
  before_stock  INTEGER NOT NULL,
  after_stock   INTEGER NOT NULL,
  reason        TEXT,
  actor_user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (store_id, product_id) REFERENCES products (store_id, id) ON DELETE CASCADE,
  FOREIGN KEY (store_id, variant_id) REFERENCES product_variants (store_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_adj_store_created
  ON inventory_adjustments (store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS promo_codes (
  id                TEXT PRIMARY KEY,
  store_id          INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent')),
  discount_value    NUMERIC(14, 2) NOT NULL CHECK (discount_value >= 0),
  max_discount      NUMERIC(14, 2),
  min_order_total   NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (min_order_total >= 0),
  usage_limit       INTEGER,
  used_count        INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_store_active
  ON promo_codes (store_id, is_active);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id            TEXT PRIMARY KEY,
  store_id      INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  promo_id      TEXT NOT NULL REFERENCES promo_codes (id) ON DELETE CASCADE,
  order_id      TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  discount_applied NUMERIC(14, 2) NOT NULL CHECK (discount_applied >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_store_promo
  ON promo_redemptions (store_id, promo_id, created_at DESC);

COMMIT;
