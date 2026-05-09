-- Jewelry E-Commerce Platform — PostgreSQL Database
-- store_id convention: 1 = phụ kiện trang sức (jewelry accessories)
-- Run once on empty DB or via docker-entrypoint-initdb.d/

-- -----------------------------------------------------------------------------
-- ENUM types
-- -----------------------------------------------------------------------------

CREATE TYPE order_status AS ENUM (
  'pending', 'processing', 'shipped', 'delivered', 'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'unpaid', 'paid', 'refunded', 'failed'
);

CREATE TYPE gender_target AS ENUM (
  'unisex', 'men', 'women', 'kids'
);

CREATE TYPE jewelry_type AS ENUM (
  'ring', 'necklace', 'earring', 'bracelet', 'set', 'anklet'
);

CREATE TYPE jewelry_finish AS ENUM (
  'polished', 'matte', 'brushed'
);

CREATE TYPE order_timeline_status_code AS ENUM (
  'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'out_for_delivery', 'custom'
);

CREATE TYPE user_role AS ENUM (
  'user', 'staff', 'admin'
);

-- -----------------------------------------------------------------------------
-- Core tables
-- -----------------------------------------------------------------------------

CREATE TABLE stores (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  store_id      INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  password_hash TEXT,
  name          TEXT NOT NULL,
  phone         TEXT,
  avatar        TEXT,
  bio           TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  role          user_role NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE (store_id, email)
);

CREATE INDEX idx_users_store ON users (store_id);

-- JWT access-token revocation (logout); rows may be purged after expires_at
CREATE TABLE revoked_access_tokens (
  jti         TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_revoked_access_tokens_exp ON revoked_access_tokens (expires_at);

CREATE TABLE addresses (
  id          TEXT PRIMARY KEY,
  store_id    INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT NOT NULL,
  city        TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_addresses_store_user ON addresses (store_id, user_id);

-- Category business id per store (e.g. rings, accessories)
CREATE TABLE categories (
  store_id    INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  label       TEXT NOT NULL,
  slug        TEXT NOT NULL,
  image       TEXT,
  parent_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  PRIMARY KEY (store_id, id),
  UNIQUE (store_id, slug)
);

-- Single-table products; store-specific columns nullable for the other tenant
CREATE TABLE products (
  store_id            INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  id                  TEXT NOT NULL,
  category_id         TEXT,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  description         TEXT NOT NULL,
  short_description   TEXT,
  default_image       TEXT NOT NULL,
  base_price          NUMERIC(14, 2) NOT NULL,
  compare_at_price    NUMERIC(14, 2),
  sale_price          NUMERIC(14, 2),
  discount_label      TEXT,
  discount_percent    SMALLINT,
  currency            CHAR(3) NOT NULL DEFAULT 'VND',
  total_stock         INTEGER NOT NULL DEFAULT 0,
  rating_avg          NUMERIC(3, 1) NOT NULL DEFAULT 0,
  review_count        INTEGER NOT NULL DEFAULT 0,
  brand               TEXT,
  gender_target       gender_target,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  weight_grams        INTEGER,
  attributes          JSONB,

  CONSTRAINT products_total_stock_nonneg     CHECK (total_stock >= 0),
  CONSTRAINT products_base_price_nonneg      CHECK (base_price >= 0),
  CONSTRAINT products_sale_price_nonneg      CHECK (sale_price IS NULL OR sale_price >= 0),
  CONSTRAINT products_compare_at_price_nonneg CHECK (compare_at_price IS NULL OR compare_at_price >= 0),


  -- Jewelry (store 1)
  jewelry_type        jewelry_type,
  material            TEXT,
  karat               TEXT,
  gemstone            TEXT,
  gemstone_carat      NUMERIC(8, 3),
  finish              jewelry_finish,
  chain_length_cm     NUMERIC(6, 2),
  hypoallergenic      BOOLEAN,
  occasion            TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,

  PRIMARY KEY (store_id, id),
  UNIQUE (store_id, slug),
  FOREIGN KEY (store_id, category_id) REFERENCES categories (store_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_products_store_category ON products (store_id, category_id);
CREATE INDEX idx_products_store_active ON products (store_id, is_active);

CREATE TABLE product_images (
  id           TEXT PRIMARY KEY,
  store_id     INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL,
  url          TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (store_id, product_id) REFERENCES products (store_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_product_images_store_product ON product_images (store_id, product_id);

CREATE TABLE product_variants (
  store_id    INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  sku         TEXT NOT NULL,
  color       TEXT,
  size        TEXT,
  price       NUMERIC(14, 2),
  stock       INTEGER NOT NULL DEFAULT 0,
  image       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT pv_stock_nonneg CHECK (stock >= 0),
  CONSTRAINT pv_price_nonneg CHECK (price IS NULL OR price >= 0),
  PRIMARY KEY (store_id, id),
  UNIQUE (store_id, sku),
  FOREIGN KEY (store_id, product_id) REFERENCES products (store_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_product_variants_store_product ON product_variants (store_id, product_id);

CREATE TABLE carts (
  id          TEXT PRIMARY KEY,
  store_id    INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, user_id)
);

CREATE TABLE cart_items (
  id                    TEXT PRIMARY KEY,
  store_id              INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  cart_id               TEXT NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  product_id            TEXT NOT NULL,
  variant_id            TEXT,
  quantity              INTEGER NOT NULL DEFAULT 1,
  unit_price_snapshot   NUMERIC(14, 2) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (store_id, product_id) REFERENCES products (store_id, id) ON DELETE CASCADE,
  FOREIGN KEY (store_id, variant_id) REFERENCES product_variants (store_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_cart_items_store_cart ON cart_items (store_id, cart_id);
CREATE INDEX idx_cart_items_cart_product ON cart_items (cart_id, product_id);

CREATE TABLE payment_methods (
  store_id    INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  icon        TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, code)
);

CREATE TABLE orders (
  id                     TEXT PRIMARY KEY,
  store_id               INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  user_id                TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  code                   TEXT NOT NULL,
  status                 order_status NOT NULL DEFAULT 'pending',
  placed_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal               NUMERIC(14, 2) NOT NULL,
  shipping_fee           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_total         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total                  NUMERIC(14, 2) NOT NULL,
  currency               CHAR(3) NOT NULL DEFAULT 'VND',
  payment_method_code    TEXT NOT NULL,
  payment_status         payment_status NOT NULL DEFAULT 'unpaid',
  ship_name              TEXT NOT NULL,
  ship_phone             TEXT NOT NULL,
  ship_address           TEXT NOT NULL,
  ship_city              TEXT NOT NULL,
  ship_address_id        TEXT REFERENCES addresses (id) ON DELETE SET NULL,
  tracking_number        TEXT,
  estimated_delivery_at  TIMESTAMPTZ,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at           TIMESTAMPTZ,
  CONSTRAINT orders_subtotal_nonneg       CHECK (subtotal >= 0),
  CONSTRAINT orders_shipping_fee_nonneg   CHECK (shipping_fee >= 0),
  CONSTRAINT orders_discount_total_nonneg CHECK (discount_total >= 0),
  CONSTRAINT orders_total_nonneg          CHECK (total >= 0),
  UNIQUE (store_id, code),
  FOREIGN KEY (store_id, payment_method_code) REFERENCES payment_methods (store_id, code)
);

CREATE INDEX idx_orders_store_user_placed ON orders (store_id, user_id, placed_at DESC);
CREATE INDEX idx_orders_store_status ON orders (store_id, status);
CREATE INDEX idx_orders_store_status_placed ON orders (store_id, status, placed_at DESC);

CREATE TABLE promo_codes (
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

CREATE INDEX idx_promo_codes_store_active
  ON promo_codes (store_id, is_active);

CREATE TABLE promo_redemptions (
  id            TEXT PRIMARY KEY,
  store_id      INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  promo_id      TEXT NOT NULL REFERENCES promo_codes (id) ON DELETE CASCADE,
  order_id      TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  discount_applied NUMERIC(14, 2) NOT NULL CHECK (discount_applied >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_redemptions_store_promo
  ON promo_redemptions (store_id, promo_id, created_at DESC);

CREATE TABLE order_items (
  id                      TEXT PRIMARY KEY,
  store_id                INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  order_id                TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id              TEXT,
  variant_id              TEXT,
  name_snapshot           TEXT NOT NULL,
  image_snapshot          TEXT NOT NULL,
  sku_snapshot            TEXT,
  variant_attrs_snapshot  JSONB,
  unit_price              NUMERIC(14, 2) NOT NULL,
  quantity                INTEGER NOT NULL,
  line_total              NUMERIC(14, 2) NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oi_quantity_positive CHECK (quantity > 0),
  CONSTRAINT oi_unit_price_nonneg CHECK (unit_price >= 0),
  CONSTRAINT oi_line_total_nonneg CHECK (line_total >= 0)
);

CREATE INDEX idx_order_items_store_order ON order_items (store_id, order_id);
CREATE INDEX idx_order_items_store_product ON order_items (store_id, product_id);

CREATE TABLE order_timelines (
  id            TEXT PRIMARY KEY,
  store_id      INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  order_id      TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  status_label  TEXT NOT NULL,
  status_code   order_timeline_status_code,
  happened_at   TIMESTAMPTZ NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_timelines_store_order_pos ON order_timelines (store_id, order_id, position);

CREATE TABLE onboarding_seen (
  id         TEXT PRIMARY KEY,
  store_id   INTEGER NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES users (id) ON DELETE SET NULL,
  client_key TEXT NOT NULL,
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, client_key)
);

CREATE INDEX idx_onboarding_seen_store_user ON onboarding_seen (store_id, user_id);
