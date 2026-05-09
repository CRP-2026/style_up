from sqlalchemy import (
    Boolean,
    CHAR,
    Column,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    PrimaryKeyConstraint,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from app.core.database import Base

# --- PostgreSQL ENUMs (create_type=False: created by init_database.sql) ---

order_status_pg = ENUM(
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    name="order_status",
    create_type=False,
)
payment_status_pg = ENUM("unpaid", "paid", "refunded", "failed", name="payment_status", create_type=False)
gender_target_pg = ENUM("unisex", "men", "women", "kids", name="gender_target", create_type=False)
jewelry_type_pg = ENUM(
    "ring",
    "necklace",
    "earring",
    "bracelet",
    "set",
    "anklet",
    name="jewelry_type",
    create_type=False,
)
jewelry_finish_pg = ENUM("polished", "matte", "brushed", name="jewelry_finish", create_type=False)
order_timeline_status_code_pg = ENUM(
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "out_for_delivery",
    "custom",
    name="order_timeline_status_code",
    create_type=False,
)
user_role_pg = ENUM("user", "staff", "admin", name="user_role", create_type=False)


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    slug = Column(Text, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    email = Column(Text, nullable=False)
    password_hash = Column(Text, nullable=True)
    name = Column(Text, nullable=False)
    phone = Column(Text)
    avatar = Column(Text)
    bio = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default="true")
    role = Column(user_role_pg, nullable=False, server_default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    __table_args__ = (UniqueConstraint("store_id", "email", name="uq_users_store_email"),)


class RevokedAccessToken(Base):
    __tablename__ = "revoked_access_tokens"

    jti = Column(Text, primary_key=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    phone = Column(Text, nullable=False)
    address = Column(Text, nullable=False)
    city = Column(Text, nullable=False)
    is_default = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True))


class Category(Base):
    __tablename__ = "categories"

    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    id = Column(Text, nullable=False)
    label = Column(Text, nullable=False)
    slug = Column(Text, nullable=False)
    image = Column(Text)
    parent_id = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    __table_args__ = (
        PrimaryKeyConstraint("store_id", "id"),
        UniqueConstraint("store_id", "slug", name="uq_categories_store_slug"),
    )


class Product(Base):
    __tablename__ = "products"

    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    id = Column(Text, nullable=False)
    category_id = Column(Text)
    name = Column(Text, nullable=False)
    slug = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    short_description = Column(Text)
    default_image = Column(Text, nullable=False)
    base_price = Column(Numeric(14, 2), nullable=False)
    compare_at_price = Column(Numeric(14, 2))
    sale_price = Column(Numeric(14, 2))
    discount_label = Column(Text)
    discount_percent = Column(Integer)
    currency = Column(CHAR(3), nullable=False, server_default="VND")
    total_stock = Column(Integer, nullable=False, server_default="0")
    rating_avg = Column(Numeric(3, 1), nullable=False, server_default="0")
    review_count = Column(Integer, nullable=False, server_default="0")
    brand = Column(Text)
    gender_target = Column(gender_target_pg)
    is_active = Column(Boolean, nullable=False, server_default="true")
    is_featured = Column(Boolean, nullable=False, server_default="false")
    weight_grams = Column(Integer)
    attributes = Column(JSONB)

    # Jewelry attributes
    jewelry_type = Column(jewelry_type_pg)
    material = Column(Text)
    karat = Column(Text)
    gemstone = Column(Text)
    gemstone_carat = Column(Numeric(8, 3))
    finish = Column(jewelry_finish_pg)
    chain_length_cm = Column(Numeric(6, 2))
    hypoallergenic = Column(Boolean)
    occasion = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    __table_args__ = (
        PrimaryKeyConstraint("store_id", "id"),
        UniqueConstraint("store_id", "slug", name="uq_products_store_slug"),
        ForeignKeyConstraint(
            ["store_id", "category_id"],
            ["categories.store_id", "categories.id"],
            ondelete="RESTRICT",
            name="products_category_fk",
        ),
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Text, nullable=False)
    url = Column(Text, nullable=False)
    position = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        ForeignKeyConstraint(
            ["store_id", "product_id"],
            ["products.store_id", "products.id"],
            ondelete="CASCADE",
        ),
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    id = Column(Text, nullable=False)
    product_id = Column(Text, nullable=False)
    sku = Column(Text, nullable=False)
    color = Column(Text)
    size = Column(Text)
    price = Column(Numeric(14, 2))
    stock = Column(Integer, nullable=False, server_default="0")
    image = Column(Text)
    position = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True))

    __table_args__ = (
        PrimaryKeyConstraint("store_id", "id"),
        UniqueConstraint("store_id", "sku", name="uq_variants_store_sku"),
        ForeignKeyConstraint(
            ["store_id", "product_id"],
            ["products.store_id", "products.id"],
            ondelete="CASCADE",
        ),
    )


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), primary_key=True)
    code = Column(Text, primary_key=True)
    title = Column(Text, nullable=False)
    subtitle = Column(Text)
    icon = Column(Text)
    enabled = Column(Boolean, nullable=False, server_default="true")
    position = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Text, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    code = Column(Text, nullable=False)
    status = Column(order_status_pg, nullable=False, server_default="pending")
    placed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    subtotal = Column(Numeric(14, 2), nullable=False)
    shipping_fee = Column(Numeric(14, 2), nullable=False, server_default="0")
    discount_total = Column(Numeric(14, 2), nullable=False, server_default="0")
    total = Column(Numeric(14, 2), nullable=False)
    currency = Column(CHAR(3), nullable=False, server_default="VND")
    payment_method_code = Column(Text, nullable=False)
    payment_status = Column(payment_status_pg, nullable=False, server_default="unpaid")
    ship_name = Column(Text, nullable=False)
    ship_phone = Column(Text, nullable=False)
    ship_address = Column(Text, nullable=False)
    ship_city = Column(Text, nullable=False)
    ship_address_id = Column(Text, ForeignKey("addresses.id", ondelete="SET NULL"))
    tracking_number = Column(Text)
    estimated_delivery_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    cancelled_at = Column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("store_id", "code", name="uq_orders_store_code"),
        ForeignKeyConstraint(
            ["store_id", "payment_method_code"],
            ["payment_methods.store_id", "payment_methods.code"],
            name="orders_payment_fk",
        ),
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Text, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Text)
    variant_id = Column(Text)
    name_snapshot = Column(Text, nullable=False)
    image_snapshot = Column(Text, nullable=False)
    sku_snapshot = Column(Text)
    variant_attrs_snapshot = Column(JSONB)
    unit_price = Column(Numeric(14, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    line_total = Column(Numeric(14, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class OrderTimeline(Base):
    __tablename__ = "order_timelines"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Text, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    status_label = Column(Text, nullable=False)
    status_code = Column(order_timeline_status_code_pg)
    happened_at = Column(DateTime(timezone=True), nullable=False)
    completed = Column(Boolean, nullable=False, server_default="false")
    position = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class InventoryAdjustment(Base):
    __tablename__ = "inventory_adjustments"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Text, nullable=False)
    variant_id = Column(Text, nullable=False)
    before_stock = Column(Integer, nullable=False)
    after_stock = Column(Integer, nullable=False)
    reason = Column(Text)
    actor_user_id = Column(Text, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        ForeignKeyConstraint(
            ["store_id", "product_id"],
            ["products.store_id", "products.id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["store_id", "variant_id"],
            ["product_variants.store_id", "product_variants.id"],
            ondelete="CASCADE",
        ),
    )


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    code = Column(Text, nullable=False)
    discount_type = Column(Text, nullable=False)
    discount_value = Column(Numeric(14, 2), nullable=False)
    max_discount = Column(Numeric(14, 2))
    min_order_total = Column(Numeric(14, 2), nullable=False, server_default="0")
    usage_limit = Column(Integer)
    used_count = Column(Integer, nullable=False, server_default="0")
    starts_at = Column(DateTime(timezone=True))
    ends_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("store_id", "code", name="uq_promo_codes_store_code"),)


class PromoRedemption(Base):
    __tablename__ = "promo_redemptions"

    id = Column(Text, primary_key=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    promo_id = Column(Text, ForeignKey("promo_codes.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Text, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    discount_applied = Column(Numeric(14, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
