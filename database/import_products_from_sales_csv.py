#!/usr/bin/env python3
"""
Import product-focused data from external sales CSV into project database.

Goal:
- Populate catalog for UI demo quickly (many products visible)
- Only touch: categories, products, product_variants
- Do NOT create users/orders/payments

Usage:
  # Bước 1 — chỉ xóa hết catalog store (không nạp CSV). Nạp lại CSV để sau, chạy lệnh có --csv.
  python database/import_products_from_sales_csv.py --reset-only --confirm-reset 2 --store-id 2

Import CSV (khi cần):
  python database/import_products_from_sales_csv.py --csv "path/to/data.csv"
  python database/import_products_from_sales_csv.py --csv "shopify_export.csv" --format shopify

Trong một lần chạy: xóa hết catalog rồi import CSV (một transaction):
  python database/import_products_from_sales_csv.py --csv "..." --wipe-catalog --confirm-reset 2 --store-id 2
  (--wipe-catalog giống --reset-catalog)

Chỉ xóa lượt import CSV sales trước (id bắt đầu ext-), giữ sản phẩm seed:
  python database/import_products_from_sales_csv.py --csv "..." --delete-product-id-prefix ext- --confirm-reset 2 --store-id 2

CSV có ASICS nhưng không muốn đưa vào DB (xóa ext-* ASICS rồi bỏ qua khi import):
  python database/import_products_from_sales_csv.py --csv "..." --purge-ext-brand ASICS --exclude-brand ASICS --confirm-reset 2 --store-id 2

Optional:
  --database-url "postgresql://postgres:230705@localhost:5432/style_up"
  --store-id 2
  --format auto|sales|shopify|shoes_dim   # auto: nhận diện theo header
  --currency-mode vnd   # chỉ format sales: vnd | usd (default: vnd)
  --usd-to-vnd 25000
  --reset-catalog | --wipe-catalog   # xóa hết products+categories của store
  --reset-only                      # chỉ wipe catalog + commit (không đọc CSV)
  --delete-product-id-prefix P # chỉ xóa products có id LIKE 'P%' (không xóa categories)
  --purge-ext-brand BRAND      # xóa products ext-* có brand khớp (lặp được). Cần --confirm-reset
  --exclude-brand BRAND        # bỏ qua dòng CSV theo brand/vendor (lặp được)
  --confirm-reset N            # bắt buộc khi reset / delete-prefix / purge-ext-brand
  --reset-promos               # kèm reset-catalog: xóa promo_codes của store

Notes:
- sales CSV (at minimum): brand,model_name,category (+ USD price columns…)
- shopify-like CSV: Handle, Title, Vendor, Type, Variant SKU, Variant Price,
  Variant Inventory Qty, Option1/2 Name|Value, Image Src (+ optional shoetype, usagetype)
- shoes_dim CSV: id,name,best_for_wear,gender,image_url,dominant_color,sub_color1,sub_color2
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import psycopg2
from psycopg2.extensions import connection as PgConnection


def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower())
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "item"


def normalize_gender(raw: str) -> str:
    v = (raw or "").strip().lower()
    if v in {"men", "male"}:
        return "men"
    if v in {"women", "female"}:
        return "women"
    if v in {"kids", "kid", "children"}:
        return "kids"
    return "unisex"


def parse_decimal(value: str, default: Decimal = Decimal("0")) -> Decimal:
    try:
        return Decimal(str(value).strip())
    except Exception:
        return default


def to_money(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass
class ProductAgg:
    base_price: Decimal
    sale_price: Decimal | None
    discount_percent: int | None
    rating_sum: Decimal
    rating_count: int
    total_stock: int
    brand: str
    category_id: str
    category_label: str
    gender_target: str


def ensure_category(cur, store_id: int, category_id: str, category_label: str) -> None:
    cur.execute(
        """
        INSERT INTO categories (store_id, id, label, slug)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (store_id, id)
        DO UPDATE SET
          label = EXCLUDED.label,
          slug = EXCLUDED.slug,
          updated_at = NOW()
        """,
        (store_id, category_id, category_label, slugify(category_label)),
    )


def reset_store_catalog(cur, store_id: int, *, reset_promos: bool = False) -> tuple[int, int, int]:
    """
    Xóa catalog của một store (chỉ cursor; không commit).

    DELETE products → CASCADE: variants, product_images, cart_items liên quan,
    inventory_adjustments.

    Returns: (deleted_products_rowcount, deleted_categories_rowcount, deleted_promos_rowcount)
    """
    cur.execute("DELETE FROM products WHERE store_id = %s", (store_id,))
    n_products = cur.rowcount
    cur.execute("DELETE FROM categories WHERE store_id = %s", (store_id,))
    n_categories = cur.rowcount
    n_promos = 0
    if reset_promos:
        cur.execute("DELETE FROM promo_codes WHERE store_id = %s", (store_id,))
        n_promos = cur.rowcount
    return (n_products, n_categories, n_promos)


def delete_ext_products_by_brands(cur, store_id: int, brands: list[str]) -> int:
    """
    Xóa products có id bắt đầu ext- và cột brand khớp (không phân biệt hoa thường).
    An toàn hơn DELETE theo brand trên toàn bộ id (tránh đụng seed nếu không dùng ext-).
    """
    norms = sorted({b.strip().lower() for b in brands if b and b.strip()})
    if not norms:
        return 0
    cur.execute(
        """
        DELETE FROM products
        WHERE store_id = %s
          AND id LIKE %s
          AND LOWER(TRIM(brand)) = ANY(%s)
        """,
        (store_id, "ext-%", norms),
    )
    return cur.rowcount


def delete_products_by_id_prefix(cur, store_id: int, prefix: str) -> int:
    """
    Xóa products có id bắt đầu bằng prefix (VD sales CSV dùng id dạng ext-...).
    CASCADE variants / cart_items / … Không xóa categories (có thể trống hoặc trùng lần import sau).
    """
    p = prefix.strip()
    if not p:
        return 0
    if any(ch in p for ch in ("%", "_")):
        raise ValueError("--delete-product-id-prefix không được chứa % hoặc _")
    cur.execute(
        "DELETE FROM products WHERE store_id = %s AND id LIKE %s",
        (store_id, p + "%"),
    )
    return cur.rowcount


# Maps CSV type/shoetype strings → PostgreSQL enum shoe_type (products.shoe_type).
_SHOE_TYPE_MAP: dict[str, str] = {
    "basketball_shoe": "sneaker",
    "running_shoe": "sneaker",
    "training_shoe": "sneaker",
    "tennis_shoe": "sneaker",
    "soccer_shoe": "sneaker",
    "football_shoe": "sneaker",
    "lifestyle": "sneaker",
    "casual": "sneaker",
    "sneaker": "sneaker",
    "boot": "boot",
    "boots": "boot",
    "sandal": "sandal",
    "sandals": "sandal",
    "heels": "heels",
    "loafer": "loafer",
    "loafers": "loafer",
    "slipper": "slipper",
    "slippers": "slipper",
}

_USAGE_MAP: dict[str, str] = {
    "sport": "sport",
    "running": "running",
    "casual": "casual",
    "formal": "formal",
    "outdoor": "outdoor",
}


def strip_html(html: str) -> str:
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    return " ".join(text.split()).strip()


def map_shoe_type(raw: str | None) -> str | None:
    if not raw:
        return None
    key = raw.strip().lower().replace(" ", "_").replace("-", "_")
    return _SHOE_TYPE_MAP.get(key)


def map_usage_type(raw: str | None) -> str | None:
    if not raw:
        return None
    key = raw.strip().lower()
    return _USAGE_MAP.get(key)


def option_pair(
    row: dict[str, str],
    name_key: str,
    val_key: str,
) -> tuple[str | None, str | None]:
    """Return (color, size) hints from Option N Name / Value."""
    name = (row.get(name_key) or "").strip().lower()
    val = (row.get(val_key) or "").strip() or None
    if not val:
        return None, None
    if "color" in name or name == "colour":
        return val, None
    if "size" in name:
        return None, val
    # Default: Option1 → color, Option2 → size when name empty
    return None, None


def detect_csv_format(fieldnames: list[str] | None) -> str:
    if not fieldnames:
        raise ValueError("CSV không có header")
    keys = {((f or "").strip().lower()) for f in fieldnames}
    if "handle" in keys:
        return "shopify"
    if "brand" in keys and "model_name" in keys:
        return "sales"
    if "id" in keys and "name" in keys and "image_url" in keys:
        return "shoes_dim"
    raise ValueError(
        "Không nhận diện được format CSV. Dùng --format shopify, --format sales, hoặc --format shoes_dim."
    )


def import_shoes_dim_csv(
    conn: PgConnection,
    csv_path: Path,
    store_id: int,
) -> dict[str, int]:
    """
    Format dimension-like:
    id,name,best_for_wear,gender,image_url,dominant_color,sub_color1,sub_color2
    """
    row_count = 0
    variant_seen = 0
    products_seen: set[str] = set()
    default_price = Decimal("1290000")
    default_stock = 20

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required = {"id", "name", "best_for_wear", "gender", "image_url", "dominant_color"}
        missing = [k for k in required if k not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"CSV shoes_dim thiếu cột bắt buộc: {', '.join(missing)}")

        with conn.cursor() as cur:
            for row in reader:
                row_count += 1
                src_id = (row.get("id") or "").strip() or f"row-{row_count}"
                name = (row.get("name") or "").strip() or f"Shoe {src_id}"
                use = (row.get("best_for_wear") or "").strip() or "general"
                category_id = slugify(use)
                category_label = use.title()

                img = (row.get("image_url") or "").strip()
                color = (row.get("dominant_color") or "").strip() or None
                gender_raw = (row.get("gender") or "").strip().lower()
                if gender_raw in {"m", "men", "male"}:
                    gender_target = "men"
                elif gender_raw in {"f", "women", "female"}:
                    gender_target = "women"
                elif gender_raw in {"k", "kids", "kid", "children"}:
                    gender_target = "kids"
                else:
                    gender_target = "unisex"

                product_id = f"dim-{slugify(src_id)}"
                # shoes_dim có nhiều sản phẩm trùng name → slug phải gắn src_id để tránh UNIQUE(store_id, slug)
                product_slug = slugify(f"{name}-{src_id}")
                brand = name.split(" ")[0] if " " in name else "Unknown"

                ensure_category(cur, store_id, category_id, category_label)
                cur.execute(
                    """
                    INSERT INTO products (
                      store_id, id, category_id, name, slug, description, short_description,
                      default_image, base_price, sale_price, discount_label, discount_percent,
                      currency, total_stock, rating_avg, review_count, brand, gender_target,
                      is_active, is_featured
                    )
                    VALUES (
                      %s, %s, %s, %s, %s, %s, %s,
                      %s, %s, NULL, NULL, NULL,
                      'VND', 0, 0, 0, %s, %s,
                      TRUE, FALSE
                    )
                    ON CONFLICT (store_id, id)
                    DO UPDATE SET
                      category_id = EXCLUDED.category_id,
                      name = EXCLUDED.name,
                      slug = EXCLUDED.slug,
                      description = EXCLUDED.description,
                      short_description = EXCLUDED.short_description,
                      default_image = COALESCE(NULLIF(EXCLUDED.default_image, ''), products.default_image),
                      base_price = EXCLUDED.base_price,
                      brand = EXCLUDED.brand,
                      gender_target = EXCLUDED.gender_target,
                      is_active = TRUE,
                      updated_at = NOW()
                    """,
                    (
                        store_id,
                        product_id,
                        category_id,
                        name,
                        product_slug,
                        f"{name}. Best for {use}.",
                        name,
                        img or None,
                        default_price,
                        brand,
                        gender_target,
                    ),
                )
                products_seen.add(product_id)

                variant_id = f"{product_id}-one"
                sku = f"{product_id}-{slugify(color or 'default')}".upper()[:120]
                cur.execute(
                    """
                    INSERT INTO product_variants (
                      store_id, id, product_id, sku, color, size, price, stock, image, position
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
                    ON CONFLICT (store_id, id)
                    DO UPDATE SET
                      sku = EXCLUDED.sku,
                      color = EXCLUDED.color,
                      size = EXCLUDED.size,
                      price = EXCLUDED.price,
                      stock = EXCLUDED.stock,
                      image = EXCLUDED.image,
                      deleted_at = NULL,
                      updated_at = NOW()
                    """,
                    (
                        store_id,
                        variant_id,
                        product_id,
                        sku,
                        color,
                        None,
                        default_price,
                        default_stock,
                        img or None,
                    ),
                )
                variant_seen += 1

            for pid in products_seen:
                cur.execute(
                    """
                    UPDATE products p
                    SET total_stock = COALESCE((
                      SELECT SUM(v.stock)::integer FROM product_variants v
                      WHERE v.store_id = p.store_id AND v.product_id = p.id AND v.deleted_at IS NULL
                    ), 0),
                    updated_at = NOW()
                    WHERE p.store_id = %s AND p.id = %s
                    """,
                    (store_id, pid),
                )

    return {
        "rows_read": row_count,
        "products_upserted": len(products_seen),
        "variants_upserted": variant_seen,
    }


def import_shopify_csv(
    conn: PgConnection,
    csv_path: Path,
    store_id: int,
    *,
    exclude_brands: frozenset[str] | None = None,
) -> dict[str, int]:
    """Shopify-style export: one row per variant; Handle groups product."""
    row_count = 0
    variant_seen = 0
    products_seen: set[str] = set()
    last_handle = ""
    last_vendor = ""

    fallback_image = (
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff"
        "?auto=format&fit=crop&w=1200&q=60"
    )

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("CSV không có header")

        with conn.cursor() as cur:
            for raw_row in reader:
                row_count += 1
                row = {(k or "").strip(): (v or "").strip() if v is not None else "" for k, v in raw_row.items()}

                handle = (row.get("Handle") or "").strip()
                if not handle:
                    handle = last_handle
                if not handle:
                    continue
                last_handle = handle
                product_id = slugify(handle)
                if len(product_id) > 120:
                    product_id = product_id[:120]

                title = (row.get("Title") or row.get("name") or "").strip() or handle
                raw_vendor = (row.get("Vendor") or row.get("brand") or "").strip()
                if raw_vendor:
                    last_vendor = raw_vendor
                vendor = raw_vendor or last_vendor or "Unknown"
                if exclude_brands and vendor.strip().lower() in exclude_brands:
                    continue
                body_html = row.get("Body (HTML)") or row.get("Body") or ""
                description = strip_html(body_html) or f"{title}. {vendor}."
                short_desc = description[:240] if description else title

                type_raw = (row.get("Type") or "").strip()
                category_label = type_raw.replace("_", " ").title() if type_raw else "General"
                category_id = slugify(type_raw) if type_raw else "general"

                img = (row.get("Image Src") or row.get("defaultimage") or "").strip() or fallback_image

                opt1_name = "Option1 Name"
                opt1_val = "Option1 Value"
                opt2_name = "Option2 Name"
                opt2_val = "Option2 Value"
                c1, s1 = option_pair(row, opt1_name, opt1_val)
                c2, s2 = option_pair(row, opt2_name, opt2_val)
                color = c1 or c2
                size = s1 or s2
                # Fallback if names were empty but values exist
                if not color and not size:
                    v1 = (row.get(opt1_val) or "").strip() or None
                    v2 = (row.get(opt2_val) or "").strip() or None
                    color, size = v1, v2

                sku_raw = (row.get("Variant SKU") or "").strip() or f"v-{row_count}"
                # DB: UNIQUE(store_id, sku). CSV có thể trùng SKU giữa hai Handle (truncate giống nhau).
                sku = f"{product_id}-{sku_raw}"
                if len(sku) > 120:
                    sku = sku[:120]
                qty_raw = row.get("Variant Inventory Qty") or "0"
                try:
                    stock = max(0, int(parse_decimal(qty_raw, Decimal("0"))))
                except Exception:
                    stock = 0
                if stock <= 0:
                    stock = 10

                price = parse_decimal(row.get("Variant Price") or row.get("baseprice") or "0", Decimal("0"))
                compare_raw = row.get("Variant Compare At Price") or ""
                compare_at = parse_decimal(compare_raw, Decimal("0")) if compare_raw.strip() else Decimal("0")

                base_price = compare_at if compare_at > 0 else price
                sale_price = price if compare_at > price > 0 else None
                disc_pct = None
                disc_label = None
                if compare_at > price > 0:
                    disc_pct = int(((compare_at - price) / compare_at * Decimal("100")).quantize(Decimal("1")))
                    disc_label = f"Sale {disc_pct}%"

                shoe_t = map_shoe_type(row.get("shoetype") or type_raw)
                usage_t = map_usage_type(row.get("usagetype"))

                status = (row.get("Status") or "active").strip().lower()
                is_active = status != "draft" and (row.get("Published") or "TRUE").strip().upper() in (
                    "TRUE",
                    "TRUE ",
                    "YES",
                    "1",
                )

                ensure_category(cur, store_id, category_id, category_label)

                if product_id not in products_seen:
                    products_seen.add(product_id)
                    slug = slugify(handle)
                    cur.execute(
                        """
                        INSERT INTO products (
                          store_id, id, category_id, name, slug, description, short_description,
                          default_image, base_price, sale_price, discount_label, discount_percent,
                          compare_at_price, currency, total_stock, rating_avg, review_count,
                          brand, gender_target, shoe_type, usage_type,
                          is_active, is_featured
                        )
                        VALUES (
                          %s, %s, %s, %s, %s, %s, %s,
                          %s, %s, %s, %s, %s,
                          %s, 'VND', 0, 0, 0,
                          %s, 'unisex', %s, %s,
                          %s, FALSE
                        )
                        ON CONFLICT (store_id, id)
                        DO UPDATE SET
                          category_id = EXCLUDED.category_id,
                          name = EXCLUDED.name,
                          slug = EXCLUDED.slug,
                          description = EXCLUDED.description,
                          short_description = EXCLUDED.short_description,
                          default_image = COALESCE(NULLIF(EXCLUDED.default_image, ''), products.default_image),
                          brand = EXCLUDED.brand,
                          shoe_type = COALESCE(EXCLUDED.shoe_type, products.shoe_type),
                          usage_type = COALESCE(EXCLUDED.usage_type, products.usage_type),
                          is_active = EXCLUDED.is_active,
                          updated_at = NOW()
                        """,
                        (
                            store_id,
                            product_id,
                            category_id,
                            title,
                            slug,
                            description,
                            short_desc,
                            img,
                            to_money(base_price),
                            to_money(sale_price) if sale_price else None,
                            disc_label,
                            disc_pct,
                            to_money(compare_at) if compare_at > 0 else None,
                            vendor,
                            shoe_t,
                            usage_t,
                            is_active,
                        ),
                    )

                variant_id = slugify(f"{product_id}-{sku_raw}")[:200]
                if len(variant_id) < 4:
                    variant_id = f"{product_id}-v-{row_count}"

                variant_price = to_money(price) if price > 0 else to_money(base_price)

                cur.execute(
                    """
                    INSERT INTO product_variants (
                      store_id, id, product_id, sku, color, size, price, stock, image, position
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
                    ON CONFLICT (store_id, id)
                    DO UPDATE SET
                      sku = EXCLUDED.sku,
                      color = EXCLUDED.color,
                      size = EXCLUDED.size,
                      price = EXCLUDED.price,
                      stock = EXCLUDED.stock,
                      image = EXCLUDED.image,
                      deleted_at = NULL,
                      updated_at = NOW()
                    """,
                    (
                        store_id,
                        variant_id,
                        product_id,
                        sku,
                        color,
                        size,
                        variant_price,
                        stock,
                        img,
                    ),
                )
                variant_seen += 1

            # Recompute total_stock per product touched
            for pid in products_seen:
                cur.execute(
                    """
                    UPDATE products p
                    SET total_stock = COALESCE((
                      SELECT SUM(v.stock)::integer FROM product_variants v
                      WHERE v.store_id = p.store_id AND v.product_id = p.id AND v.deleted_at IS NULL
                    ), 0),
                    updated_at = NOW()
                    WHERE p.store_id = %s AND p.id = %s
                    """,
                    (store_id, pid),
                )

    return {
        "rows_read": row_count,
        "products_upserted": len(products_seen),
        "variants_upserted": variant_seen,
    }


def import_csv(
    conn: PgConnection,
    csv_path: Path,
    store_id: int,
    currency_mode: str,
    usd_to_vnd: Decimal,
    *,
    exclude_brands: frozenset[str] | None = None,
) -> dict[str, int]:
    product_stats: dict[str, ProductAgg] = {}
    variant_seen = 0
    row_count = 0

    # Stable placeholder image for demo catalog.
    fallback_image = (
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff"
        "?auto=format&fit=crop&w=1200&q=60"
    )

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required = {"brand", "model_name", "category"}
        missing = [k for k in required if k not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"CSV thiếu cột bắt buộc: {', '.join(missing)}")

        with conn.cursor() as cur:
            for row in reader:
                row_count += 1
                brand = (row.get("brand") or "").strip() or "Unknown"
                if exclude_brands and brand.strip().lower() in exclude_brands:
                    continue
                model = (row.get("model_name") or "").strip() or f"Model-{row_count}"
                category_label = (row.get("category") or "").strip() or "General"
                category_id = slugify(category_label)
                gender_target = normalize_gender(row.get("gender") or "")

                product_id = f"ext-{slugify(brand)}-{slugify(model)}"
                product_slug = slugify(f"{brand}-{model}")

                base_usd = parse_decimal(row.get("base_price_usd") or "0", Decimal("0"))
                final_usd = parse_decimal(row.get("final_price_usd") or "0", base_usd)
                discount_percent = int(parse_decimal(row.get("discount_percent") or "0", Decimal("0")))
                rating = parse_decimal(row.get("customer_rating") or "0", Decimal("0"))
                units_sold = int(parse_decimal(row.get("units_sold") or "1", Decimal("1")))
                size = (row.get("size") or "").strip() or None
                color = (row.get("color") or "").strip() or None

                if currency_mode == "vnd":
                    base_price = to_money(base_usd * usd_to_vnd)
                    final_price = to_money(final_usd * usd_to_vnd)
                else:
                    base_price = to_money(base_usd)
                    final_price = to_money(final_usd)

                sale_price = final_price if final_price > Decimal("0") and final_price < base_price else None
                discount_label = f"Sale {discount_percent}%" if discount_percent > 0 else None
                variant_stock = max(5, units_sold * 2)

                ensure_category(cur, store_id, category_id, category_label)

                cur.execute(
                    """
                    INSERT INTO products (
                      store_id, id, category_id, name, slug, description, short_description,
                      default_image, base_price, sale_price, discount_label, discount_percent,
                      currency, total_stock, rating_avg, review_count, brand, gender_target,
                      is_active, is_featured
                    )
                    VALUES (
                      %s, %s, %s, %s, %s, %s, %s,
                      %s, %s, %s, %s, %s,
                      %s, %s, %s, %s, %s, %s,
                      TRUE, FALSE
                    )
                    ON CONFLICT (store_id, id)
                    DO UPDATE SET
                      category_id = EXCLUDED.category_id,
                      name = EXCLUDED.name,
                      slug = EXCLUDED.slug,
                      description = EXCLUDED.description,
                      short_description = EXCLUDED.short_description,
                      default_image = EXCLUDED.default_image,
                      base_price = EXCLUDED.base_price,
                      sale_price = EXCLUDED.sale_price,
                      discount_label = EXCLUDED.discount_label,
                      discount_percent = EXCLUDED.discount_percent,
                      brand = EXCLUDED.brand,
                      gender_target = EXCLUDED.gender_target,
                      is_active = TRUE,
                      updated_at = NOW()
                    """,
                    (
                        store_id,
                        product_id,
                        category_id,
                        f"{brand} {model}",
                        product_slug,
                        f"{brand} {model} imported from external CSV dataset.",
                        f"{brand} {model}",
                        fallback_image,
                        base_price,
                        sale_price,
                        discount_label,
                        discount_percent if discount_percent > 0 else None,
                        "VND" if currency_mode == "vnd" else "USD",
                        0,  # recompute after variants
                        0,
                        0,
                        brand,
                        gender_target,
                    ),
                )

                variant_id = f"{product_id}-{slugify(str(size or 'default'))}-{slugify(str(color or 'default'))}"
                sku = f"{slugify(brand)[:8]}-{slugify(model)[:10]}-{slugify(str(size or 'na'))}-{slugify(str(color or 'na'))}".upper()

                cur.execute(
                    """
                    INSERT INTO product_variants (
                      store_id, id, product_id, sku, color, size, price, stock, image, position
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
                    ON CONFLICT (store_id, id)
                    DO UPDATE SET
                      sku = EXCLUDED.sku,
                      color = EXCLUDED.color,
                      size = EXCLUDED.size,
                      price = EXCLUDED.price,
                      stock = EXCLUDED.stock,
                      image = EXCLUDED.image,
                      deleted_at = NULL,
                      updated_at = NOW()
                    """,
                    (
                        store_id,
                        variant_id,
                        product_id,
                        sku,
                        color,
                        size,
                        sale_price or base_price,
                        variant_stock,
                        fallback_image,
                    ),
                )
                variant_seen += 1

                agg = product_stats.get(product_id)
                if agg is None:
                    agg = ProductAgg(
                        base_price=base_price,
                        sale_price=sale_price,
                        discount_percent=discount_percent if discount_percent > 0 else None,
                        rating_sum=Decimal("0"),
                        rating_count=0,
                        total_stock=0,
                        brand=brand,
                        category_id=category_id,
                        category_label=category_label,
                        gender_target=gender_target,
                    )
                    product_stats[product_id] = agg

                agg.total_stock += variant_stock
                if rating > 0:
                    agg.rating_sum += rating
                    agg.rating_count += 1

            for product_id, agg in product_stats.items():
                rating_avg = (
                    (agg.rating_sum / Decimal(agg.rating_count)).quantize(Decimal("0.1"))
                    if agg.rating_count > 0
                    else Decimal("0.0")
                )
                cur.execute(
                    """
                    UPDATE products
                    SET total_stock = %s,
                        rating_avg = %s,
                        review_count = %s,
                        updated_at = NOW()
                    WHERE store_id = %s AND id = %s
                    """,
                    (agg.total_stock, rating_avg, agg.rating_count, store_id, product_id),
                )

    return {
        "rows_read": row_count,
        "products_upserted": len(product_stats),
        "variants_upserted": variant_seen,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import catalog từ CSV, hoặc chỉ xóa hết catalog store (--reset-only, không cần CSV)."
    )
    parser.add_argument(
        "--csv",
        default="",
        help="Path to CSV file (không cần khi --reset-only)",
    )
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL", ""), help="PostgreSQL URL")
    parser.add_argument("--store-id", type=int, default=2, help="Target store_id (default: 2)")
    parser.add_argument(
        "--format",
        choices=["auto", "sales", "shopify", "shoes_dim"],
        default="auto",
        help="CSV layout: sales (brand/model_name), shopify (Handle/Variant…), shoes_dim (id/name/image_url), auto detect",
    )
    parser.add_argument(
        "--currency-mode",
        choices=["vnd", "usd"],
        default="vnd",
        help="Convert USD to VND or keep USD",
    )
    parser.add_argument(
        "--usd-to-vnd",
        default="25000",
        help="Rate used when --currency-mode vnd (default: 25000)",
    )
    parser.add_argument(
        "--reset-catalog",
        "--wipe-catalog",
        action="store_true",
        dest="reset_catalog",
        help="Xóa hết products + categories của store trước khi import (cùng transaction). Alias: --wipe-catalog",
    )
    parser.add_argument(
        "--reset-only",
        action="store_true",
        help=(
            "Tự bật xóa full catalog (--wipe-catalog), commit xong thoát; không cần --csv / không import. "
            "Có thể kèm --reset-promos."
        ),
    )
    parser.add_argument(
        "--confirm-reset",
        default="",
        metavar="STORE_ID",
        help="Bắt buộc khi reset / delete-prefix / purge-ext-brand: trùng --store-id (vd --confirm-reset 2)",
    )
    parser.add_argument(
        "--reset-promos",
        action="store_true",
        help="Với --reset-catalog: xóa luôn promo_codes của store (và promo_redemptions CASCADE)",
    )
    parser.add_argument(
        "--delete-product-id-prefix",
        default="",
        metavar="PREFIX",
        help=(
            "Trước khi import: xóa products có id bắt đầu bằng PREFIX (VD ext- cho CSV sales). "
            "Không dùng cùng --reset-catalog."
        ),
    )
    parser.add_argument(
        "--purge-ext-brand",
        action="append",
        default=[],
        dest="purge_ext_brands",
        metavar="BRAND",
        help=(
            "Trước import: xóa products có id ext-* và brand khớp (không phân biệt hoa thường). "
            "Lặp option để nhiều hãng. Cần --confirm-reset."
        ),
    )
    parser.add_argument(
        "--exclude-brand",
        action="append",
        default=[],
        dest="exclude_brands",
        metavar="BRAND",
        help=(
            "Khi import: bỏ qua dòng có brand (sales) hoặc Vendor (shopify) khớp. "
            "Lặp option để nhiều hãng."
        ),
    )
    args = parser.parse_args()

    if args.reset_only:
        args.reset_catalog = True

    if args.reset_promos and not args.reset_catalog:
        parser.error("--reset-promos chỉ dùng kèm --reset-catalog / --wipe-catalog")

    prefix_delete = (args.delete_product_id_prefix or "").strip()
    if args.reset_catalog and prefix_delete:
        parser.error("Không dùng đồng thời --reset-catalog và --delete-product-id-prefix")

    purge_brands_raw = [b.strip() for b in (args.purge_ext_brands or []) if b and b.strip()]
    exclude_brand_set = frozenset(
        b.strip().lower() for b in (args.exclude_brands or []) if b and b.strip()
    )
    exclude_brands_arg: frozenset[str] | None = exclude_brand_set if exclude_brand_set else None

    if args.reset_only and (exclude_brand_set or purge_brands_raw):
        parser.error(
            "--reset-only chỉ xóa full catalog; không dùng --exclude-brand hay --purge-ext-brand"
        )

    needs_confirm = args.reset_catalog or bool(prefix_delete) or bool(purge_brands_raw)

    csv_arg = (args.csv or "").strip()
    if not args.reset_only:
        if not csv_arg:
            parser.error("Thiếu --csv (hoặc dùng --reset-only để chỉ xóa catalog)")
        csv_path = Path(csv_arg)
        if not csv_path.exists():
            raise FileNotFoundError(f"CSV không tồn tại: {csv_path}")
    elif csv_arg:
        print(
            "[reset-only] Không đọc CSV; bỏ qua --csv đã truyền.",
            file=sys.stderr,
        )

    db_url = args.database_url.strip()
    if not db_url:
        raise ValueError("Thiếu DATABASE_URL. Truyền --database-url hoặc set env DATABASE_URL.")

    usd_to_vnd = parse_decimal(args.usd_to_vnd, Decimal("25000"))
    if usd_to_vnd <= 0:
        raise ValueError("--usd-to-vnd phải > 0")

    csv_format = args.format
    if not args.reset_only:
        if csv_format == "auto":
            with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
                probe = csv.DictReader(f)
                csv_format = detect_csv_format(probe.fieldnames)

    if needs_confirm:
        confirmed = (args.confirm_reset or "").strip()
        if confirmed != str(args.store_id):
            parser.error(
                "Khi xóa dữ liệu (--reset-catalog, --delete-product-id-prefix, hoặc --purge-ext-brand) "
                f"bạn PHẢI gõ đúng: --confirm-reset {args.store_id} "
                f"(đang nhận: {confirmed!r})"
            )

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            if args.reset_catalog:
                np, nc, npr = reset_store_catalog(
                    cur, args.store_id, reset_promos=args.reset_promos
                )
                print(
                    f"[reset] store_id={args.store_id}: "
                    f"xóa ~{np} products, ~{nc} categories"
                    + (f", ~{npr} promo_codes" if args.reset_promos else "")
                )
            elif prefix_delete:
                nd = delete_products_by_id_prefix(cur, args.store_id, prefix_delete)
                print(
                    f"[delete-prefix] store_id={args.store_id}: "
                    f"xóa ~{nd} products có id bắt đầu {prefix_delete!r}"
                )
            if purge_brands_raw and not args.reset_catalog:
                nz = delete_ext_products_by_brands(cur, args.store_id, purge_brands_raw)
                print(
                    f"[purge-ext-brand] store_id={args.store_id}: "
                    f"xóa ~{nz} products ext-* brand trong {purge_brands_raw!r}"
                )

        if args.reset_only:
            conn.commit()
            print(
                "Đã commit — Đã xóa hết catalog store (products + categories). "
                "Không import CSV."
            )
        else:
            if csv_format == "shopify":
                result = import_shopify_csv(
                    conn, csv_path, args.store_id, exclude_brands=exclude_brands_arg
                )
            elif csv_format == "shoes_dim":
                result = import_shoes_dim_csv(conn, csv_path, args.store_id)
            else:
                result = import_csv(
                    conn=conn,
                    csv_path=csv_path,
                    store_id=args.store_id,
                    currency_mode=args.currency_mode,
                    usd_to_vnd=usd_to_vnd,
                    exclude_brands=exclude_brands_arg,
                )
            conn.commit()
            print(f"Format: {csv_format}")
            print("Đã commit — Import thành công:")
            print(f"- rows_read: {result['rows_read']}")
            print(f"- products_upserted: {result['products_upserted']}")
            print(f"- variants_upserted: {result['variants_upserted']}")
    except Exception:
        conn.rollback()
        print(
            "[rollback] Toàn bộ thay đổi đã hủy (kể cả bước reset nếu có). DB giữ nguyên như trước transaction.",
            file=sys.stderr,
        )
        raise
    finally:
        conn.close()


def _ensure_utf8_stdio() -> None:
    """Windows console (cp1252) hay lỗi khi print tiếng Việt sau commit."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


if __name__ == "__main__":
    _ensure_utf8_stdio()
    main()
