#!/usr/bin/env python3
"""
Import Shopify Jewelry CSV vào PostgreSQL - Phiên bản cải tiến
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import uuid
from decimal import Decimal
import psycopg2
import psycopg2.extras
from bs4 import BeautifulSoup  # pip install beautifulsoup4 lxml


def clean_html(html: str) -> str:
    """Loại bỏ thẻ HTML và lấy text sạch"""
    if not html:
        return ""
    # Remove <p> tags and other HTML
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator=" ", strip=True)
    # Loại bỏ khoảng trắng thừa
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# Category mapping removed - use category_id FK instead
# If needed, create categories in DB first and map by ID


def map_jewelry_type(v: str):
    if not v:
        return None
    s = v.strip().lower()
    mapping = {
        "pendant": "necklace",
        "necklace": "necklace",
        "necklaces": "necklace",
        "ring": "ring",
        "earring": "earring",
        "bracelet": "bracelet",
        "set": "set",
    }
    return mapping.get(s, s)


def parse_decimal(v):
    if not v or str(v).strip() in ("", "nan"):
        return None
    try:
        return Decimal(str(v)).quantize(Decimal("0.01"))
    except:
        return None


def normalize(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def ingest(csv_path: str, dsn: str, store_id: int = 1):
    products = {}
    variants_acc = []
    images_acc = []

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        
        for row in reader:
            handle = normalize(row.get("Handle"))
            if not handle:
                continue

            # === PRODUCT ===
            if handle not in products:
                description_raw = row.get("Body (HTML)") or row.get("description", "")
                description = clean_html(description_raw)

                products[handle] = {
                    "store_id": store_id,
                    "id": handle,
                    "name": normalize(row.get("Title") or row.get("name")),
                    "slug": handle,
                    "description": description,
                    "short_description": None,
                    "default_image": normalize(row.get("defaultimage") or row.get("Image Src")),
                    "base_price": parse_decimal(row.get("baseprice") or row.get("Variant Price")),
                    "compare_at_price": parse_decimal(row.get("Variant Compare At Price")),
                    "currency": "VND",
                    "total_stock": int(row.get("Variant Inventory Qty") or 0) if str(row.get("Variant Inventory Qty", "")).isdigit() else 0,
                    "brand": normalize(row.get("Vendor") or row.get("brand")),
                    "jewelry_type": map_jewelry_type(row.get("jewelrytype") or row.get("Type")),
                    "material": normalize(row.get("material")),
                    "is_active": True,
                }

            # === VARIANT ===
            sku = normalize(row.get("Variant SKU"))
            variant_id = sku or f"{handle}-v1"

            variant = {
                "store_id": store_id,
                "id": variant_id,
                "product_id": handle,
                "sku": sku or variant_id,
                "color": normalize(row.get("Option1 Value")),
                "size": normalize(row.get("Option2 Value")),
                "price": parse_decimal(row.get("Variant Price")),
                "stock": int(row.get("Variant Inventory Qty") or 0) if str(row.get("Variant Inventory Qty", "")).isdigit() else 0,
                "image": normalize(row.get("Image Src")),
                "position": int(row.get("Image Position") or 1),
            }
            variants_acc.append(variant)

            # === IMAGE ===
            img_url = normalize(row.get("Image Src"))
            if img_url:
                images_acc.append({
                    "id": uuid.uuid4().hex[:16],
                    "store_id": store_id,
                    "product_id": handle,
                    "url": img_url,
                    "position": int(row.get("Image Position") or 1),
                })

    # ====================== DATABASE ======================
    conn = psycopg2.connect(dsn)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            # Temp table cho products
            cur.execute("""
                CREATE TEMP TABLE products_stage (
                    store_id INT, id TEXT, name TEXT, slug TEXT, description TEXT,
                    short_description TEXT, default_image TEXT, base_price NUMERIC(14,2),
                    compare_at_price NUMERIC(14,2), currency CHAR(3), total_stock INT,
                    brand TEXT, jewelry_type TEXT, material TEXT, is_active BOOLEAN
                ) ON COMMIT DROP;
            """)

            # COPY products
            cols = ["store_id", "id", "name", "slug", "description", "short_description",
                    "default_image", "base_price", "compare_at_price", "currency",
                    "total_stock", "brand", "jewelry_type", "material", "is_active"]

            sio = io.StringIO()
            writer = csv.writer(sio)
            writer.writerow(cols)

            for p in products.values():
                writer.writerow([
                    p["store_id"], p["id"], p["name"], p["slug"], p["description"], None,
                    p["default_image"], p["base_price"], p["compare_at_price"], p["currency"],
                    p["total_stock"], p["brand"], p["jewelry_type"],
                    p["material"], p["is_active"]
                ])

            sio.seek(0)
            cur.copy_expert(f"COPY products_stage ({','.join(cols)}) FROM STDIN WITH CSV HEADER", sio)

            # Upsert Products
            cur.execute("""
                INSERT INTO products (store_id, id, name, slug, description, short_description,
                    default_image, base_price, compare_at_price, currency, total_stock, brand,
                    jewelry_type, material, is_active, updated_at)
                SELECT store_id, id, name, slug, description, short_description, default_image,
                    base_price, compare_at_price, currency, total_stock, brand,
                    NULLIF(jewelry_type, '')::jewelry_type, material, is_active, NOW()
                FROM products_stage
                ON CONFLICT (store_id, id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    default_image = EXCLUDED.default_image,
                    base_price = EXCLUDED.base_price,
                    compare_at_price = EXCLUDED.compare_at_price,
                    total_stock = EXCLUDED.total_stock,
                    brand = EXCLUDED.brand,
                    jewelry_type = EXCLUDED.jewelry_type,
                    material = EXCLUDED.material,
                    updated_at = NOW();
            """)

            # Images & Variants (giữ nguyên logic cũ nhưng tối ưu)
            if images_acc:
                psycopg2.extras.execute_values(
                    cur,
                    "INSERT INTO product_images (id, store_id, product_id, url, position) "
                    "VALUES %s ON CONFLICT (id) DO UPDATE SET url=EXCLUDED.url, position=EXCLUDED.position",
                    [(img["id"], img["store_id"], img["product_id"], img["url"], img["position"]) for img in images_acc],
                    page_size=1000
                )

            if variants_acc:
                dedup = {(v["store_id"], v["id"]): (
                    v["store_id"], v["id"], v["product_id"], v["sku"], v["color"], v["size"],
                    v["price"], v["stock"], v["image"], v["position"]
                ) for v in variants_acc}

                psycopg2.extras.execute_values(
                    cur,
                    "INSERT INTO product_variants (store_id, id, product_id, sku, color, size, price, stock, image, position) "
                    "VALUES %s ON CONFLICT (store_id, id) DO UPDATE SET "
                    "price=EXCLUDED.price, stock=EXCLUDED.stock, image=EXCLUDED.image, sku=EXCLUDED.sku, updated_at=NOW()",
                    list(dedup.values()),
                    page_size=1000
                )

        conn.commit()
        print(f"✅ Import thành công: {len(products)} sản phẩm | {len(images_acc)} ảnh | {len(variants_acc)} variants")

    except Exception as e:
        conn.rollback()
        print(f"❌ Lỗi: {e}")
        raise
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--store", type=int, default=1)
    parser.add_argument("--dsn", help="PostgreSQL DSN")
    args = parser.parse_args()

    dsn = args.dsn or os.getenv("DATABASE_URL")
    if not dsn:
        print("Cần DATABASE_URL hoặc --dsn")
        sys.exit(1)

    ingest(args.file, dsn, args.store)


if __name__ == "__main__":
    main()