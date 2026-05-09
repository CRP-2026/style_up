from __future__ import annotations

import base64
import json
import math
import os
from pathlib import Path

import requests
from sqlalchemy import and_, exists, func, select, tuple_
from sqlalchemy.orm import Session

from app.db.models import Category, Product, ProductImage, ProductVariant


def list_categories(db: Session, store_id: int) -> list[dict]:
    rows = db.execute(
        select(Category).where(Category.store_id == store_id, Category.deleted_at.is_(None)).order_by(Category.label)
    ).scalars().all()
    return [{"id": c.id, "label": c.label, "image": c.image or ""} for c in rows]


def _master_price(p: Product) -> float:
    if p.sale_price is not None:
        return float(p.sale_price)
    return float(p.base_price)


def _serialize_variant(v: ProductVariant, fallback_price: float) -> dict:
    return {
        "id": v.id,
        "color": v.color,
        "size": v.size,
        "sku": v.sku,
        "price": float(v.price) if v.price is not None else fallback_price,
        "stock": v.stock,
        "image": v.image,
    }


def _load_variants_bulk(db: Session, keys: list[tuple[int, str]]) -> dict[tuple[int, str], list[ProductVariant]]:
    if not keys:
        return {}
    stmt = (
        select(ProductVariant)
        .where(
            tuple_(ProductVariant.store_id, ProductVariant.product_id).in_(keys),
            ProductVariant.deleted_at.is_(None),
        )
        .order_by(ProductVariant.position)
    )
    rows = db.execute(stmt).scalars().all()
    out: dict[tuple[int, str], list[ProductVariant]] = {}
    for v in rows:
        k = (v.store_id, v.product_id)
        out.setdefault(k, []).append(v)
    return out


def _load_images_bulk(db: Session, keys: list[tuple[int, str]]) -> dict[tuple[int, str], list[ProductImage]]:
    if not keys:
        return {}
    stmt = (
        select(ProductImage)
        .where(tuple_(ProductImage.store_id, ProductImage.product_id).in_(keys))
        .order_by(ProductImage.position)
    )
    rows = db.execute(stmt).scalars().all()
    out: dict[tuple[int, str], list[ProductImage]] = {}
    for img in rows:
        k = (img.store_id, img.product_id)
        out.setdefault(k, []).append(img)
    return out


_SORT_OPTIONS = {"newest", "price_asc", "price_desc", "rating_desc", "name_asc"}
HF_TIMEOUT_SECONDS = 30
HF_CLIP_URL = os.getenv(
    "HF_CLIP_ENDPOINT",
    "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32",
)
HF_VIT_URL = os.getenv(
    "HF_VIT_ENDPOINT",
    "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224",
)

_META_CACHE: dict[str, object] = {"mtime": None, "items": [], "mode": "numeric"}


def _slugify_local(value: str) -> str:
    out = []
    prev_dash = False
    for ch in (value or "").strip().lower():
        if ch.isalnum():
            out.append(ch)
            prev_dash = False
        elif not prev_dash:
            out.append("-")
            prev_dash = True
    slug = "".join(out).strip("-")
    return slug or "item"


def _metadata_path() -> Path:
    p = os.getenv("AI_METADATA_PATH", "").strip()
    if p:
        return Path(p)
    # default: <workspace>/database/metadata_jewelry.json
    return Path(__file__).resolve().parents[4] / "database" / "metadata_jewelry.json"


def _coerce_numeric_vector(raw: object) -> list[float] | None:
    if isinstance(raw, list) and raw and isinstance(raw[0], (int, float)):
        return [float(x) for x in raw]
    if isinstance(raw, list) and len(raw) == 1 and isinstance(raw[0], list):
        nested = raw[0]
        if nested and isinstance(nested[0], (int, float)):
            return [float(x) for x in nested]
    return None


def _coerce_label_scores(raw: object) -> dict[str, float] | None:
    if not isinstance(raw, list):
        return None
    pairs: dict[str, float] = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "")).strip()
        score = item.get("score")
        if not label or not isinstance(score, (int, float)):
            continue
        pairs[label] = float(score)
    return pairs or None


def _cosine_numeric(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if n <= 0:
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for i in range(n):
        ai = a[i]
        bi = b[i]
        dot += ai * bi
        na += ai * ai
        nb += bi * bi
    if na <= 0 or nb <= 0:
        return 0.0
    return dot / math.sqrt(na * nb)


def _cosine_labels(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    keys = set(a.keys()) | set(b.keys())
    dot = 0.0
    na = 0.0
    nb = 0.0
    for k in keys:
        av = a.get(k, 0.0)
        bv = b.get(k, 0.0)
        dot += av * bv
        na += av * av
        nb += bv * bv
    if na <= 0 or nb <= 0:
        return 0.0
    return dot / math.sqrt(na * nb)


def _load_metadata_vectors() -> tuple[str, list[dict]]:
    path = _metadata_path()
    if not path.exists():
        return "numeric", []
    mtime = path.stat().st_mtime
    if _META_CACHE["mtime"] == mtime and _META_CACHE["items"]:
        return str(_META_CACHE["mode"]), list(_META_CACHE["items"])  # type: ignore[arg-type]

    raw = json.loads(path.read_text(encoding="utf-8"))
    items_raw = raw.get("items", []) if isinstance(raw, dict) else []
    parsed_items: list[dict] = []
    mode = "numeric"

    for it in items_raw:
        if not isinstance(it, dict):
            continue
        sid = str(it.get("id", "")).strip()
        if not sid:
            continue
        vec = _coerce_numeric_vector(it.get("vector"))
        if vec is not None:
            parsed_items.append(
                {
                    "product_id": sid,
                    "name": str(it.get("name", "")).strip(),
                    "image_url": str(it.get("image_url", "")).strip(),
                    "numeric": vec,
                    "labels": None,
                }
            )
            continue
        labels = _coerce_label_scores(it.get("vector"))
        if labels is not None:
            mode = "labels"
            parsed_items.append(
                {
                    "product_id": sid,
                    "name": str(it.get("name", "")).strip(),
                    "image_url": str(it.get("image_url", "")).strip(),
                    "numeric": None,
                    "labels": labels,
                }
            )

    _META_CACHE["mtime"] = mtime
    _META_CACHE["mode"] = mode
    _META_CACHE["items"] = parsed_items
    return mode, parsed_items


def _hf_infer_vector(image_base64: str, *, mode: str) -> object:
    token = os.getenv("HF_TOKEN", "").strip()
    if not token:
        raise ValueError("Missing HF_TOKEN in backend environment")
    endpoint = HF_CLIP_URL if mode == "numeric" else HF_VIT_URL
    payload = {"inputs": f"data:image/jpeg;base64,{image_base64}"}
    resp = requests.post(
        endpoint,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=HF_TIMEOUT_SECONDS,
    )
    resp.raise_for_status()
    return resp.json()


def search_products_by_image(
    db: Session,
    store_id: int,
    *,
    image_base64: str,
    top_k: int = 10,
) -> list[dict]:
    mode, meta_items = _load_metadata_vectors()
    if not meta_items:
        return []

    # sanity check base64
    base64.b64decode(image_base64, validate=True)
    query_raw = _hf_infer_vector(image_base64, mode=mode)
    if mode == "numeric":
        q_vec = _coerce_numeric_vector(query_raw)
        if not q_vec:
            return []
    else:
        q_labels = _coerce_label_scores(query_raw)
        if not q_labels:
            return []

    scored: list[tuple[float, str, str, str]] = []
    for item in meta_items:
        if mode == "numeric":
            vec = item.get("numeric")
            if not isinstance(vec, list):
                continue
            score = _cosine_numeric(q_vec, vec)
        else:
            labels = item.get("labels")
            if not isinstance(labels, dict):
                continue
            score = _cosine_labels(q_labels, labels)
        scored.append(
            (
                score,
                str(item.get("product_id", "")),
                str(item.get("name", "")),
                str(item.get("image_url", "")),
            )
        )

    scored.sort(key=lambda x: x[0], reverse=True)
    best = scored[: max(1, int(top_k))]

    # map metadata id -> product id in DB (supports product import id patterns)
    id_candidates: set[str] = set()
    for _, sid, _, _ in best:
        id_candidates.add(sid)
        id_candidates.add(f"dim-{_slugify_local(sid)}")

    prod_rows = (
        db.execute(
            select(Product).where(
                Product.store_id == store_id,
                Product.deleted_at.is_(None),
                Product.id.in_(list(id_candidates)),
            )
        )
        .scalars()
        .all()
    )
    by_id = {p.id: p for p in prod_rows}
    # Fallback maps: khi catalog hiện tại không dùng ID metadata (vd shopify import)
    by_image = {str(p.default_image or "").strip(): p for p in prod_rows if p.default_image}
    by_name = {str(p.name or "").strip().lower(): p for p in prod_rows if p.name}

    out: list[dict] = []
    seen_product_ids: set[str] = set()
    for score, sid, fallback_name, fallback_image in best:
        p = by_id.get(sid) or by_id.get(f"dim-{_slugify_local(sid)}")
        if p is None and fallback_image:
            # Ưu tiên map theo URL ảnh (độ chính xác cao hơn name)
            p = by_image.get(fallback_image.strip())
        if p is None and fallback_name:
            # Fallback theo name exact-lower
            p = by_name.get(fallback_name.strip().lower())
        if p is None and fallback_name:
            # Fallback cuối: ilike theo name từ metadata
            p = (
                db.execute(
                    select(Product).where(
                        Product.store_id == store_id,
                        Product.deleted_at.is_(None),
                        Product.name.ilike(f"%{fallback_name}%"),
                    )
                )
                .scalars()
                .first()
            )
        if p is None:
            # Không có product trong DB thì bỏ qua để đảm bảo click điều hướng được.
            continue
        if p.id in seen_product_ids:
            continue
        seen_product_ids.add(p.id)
        out.append(
            {
                "product_id": p.id,
                "name": p.name or fallback_name,
                "image": p.default_image or fallback_image,
                "price": _master_price(p),
                "score": round(float(score), 6),
            }
        )
    return out


def _catalog_price_expr():
    return func.coalesce(Product.sale_price, Product.base_price)


def _catalog_filter_clause(
    *,
    store_id: int,
    category_id: str | None,
    min_price: float | None,
    max_price: float | None,
    search: str | None,
    size: str | None,
    color: str | None,
    in_stock: bool | None,
):
    """Điều kiện WHERE chung cho list + count (tránh lệch phân trang)."""
    eff = _catalog_price_expr()
    conds = [
        Product.store_id == store_id,
        Product.deleted_at.is_(None),
        Product.is_active.is_(True),
    ]
    if category_id:
        conds.append(Product.category_id == category_id)
    if search:
        conds.append(Product.name.ilike(f"%{search}%"))
    if min_price is not None:
        conds.append(eff >= min_price)
    if max_price is not None:
        conds.append(eff <= max_price)

    if size or color or in_stock:
        v_cond = [
            ProductVariant.store_id == Product.store_id,
            ProductVariant.product_id == Product.id,
            ProductVariant.deleted_at.is_(None),
        ]
        if size:
            v_cond.append(ProductVariant.size == size)
        if color:
            v_cond.append(ProductVariant.color == color)
        if in_stock:
            v_cond.append(ProductVariant.stock > 0)
        conds.append(exists().where(and_(*v_cond)))

    return eff, and_(*conds)


def count_products(
    db: Session,
    store_id: int,
    *,
    category_id: str | None,
    min_price: float | None,
    max_price: float | None,
    search: str | None,
    size: str | None = None,
    color: str | None = None,
    in_stock: bool | None = None,
) -> int:
    _, filt = _catalog_filter_clause(
        store_id=store_id,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        search=search,
        size=size,
        color=color,
        in_stock=in_stock,
    )
    n = db.scalar(select(func.count(Product.id)).where(filt))
    return int(n or 0)


def list_products(
    db: Session,
    store_id: int,
    *,
    category_id: str | None,
    min_price: float | None,
    max_price: float | None,
    search: str | None,
    size: str | None = None,
    color: str | None = None,
    in_stock: bool | None = None,
    sort: str | None = None,
    limit: int,
    offset: int,
) -> list[dict]:
    eff, filt = _catalog_filter_clause(
        store_id=store_id,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        search=search,
        size=size,
        color=color,
        in_stock=in_stock,
    )
    q = select(Product).where(filt)

    sort_key = (sort or "").strip()
    if sort_key not in _SORT_OPTIONS:
        sort_key = "newest"
    if sort_key == "price_asc":
        q = q.order_by(eff.asc(), Product.name.asc())
    elif sort_key == "price_desc":
        q = q.order_by(eff.desc(), Product.name.asc())
    elif sort_key == "rating_desc":
        q = q.order_by(Product.rating_avg.desc(), Product.review_count.desc())
    elif sort_key == "name_asc":
        q = q.order_by(Product.name.asc())
    else:
        q = q.order_by(Product.created_at.desc(), Product.name.asc())

    q = q.offset(offset).limit(limit)
    products = db.execute(q).scalars().all()
    keys = [(p.store_id, p.id) for p in products]
    vmap = _load_variants_bulk(db, keys)
    imap = _load_images_bulk(db, keys)

    out = []
    for p in products:
        price = _master_price(p)
        vars_ = vmap.get((p.store_id, p.id), [])
        imgs = imap.get((p.store_id, p.id), [])
        desc = p.short_description or (p.description[:160] + "…" if len(p.description) > 160 else p.description)
        var_list = [_serialize_variant(v, price) for v in vars_] if vars_ else [
            {
                "id": f"{p.id}-default",
                "sku": p.id,
                "size": None,
                "color": None,
                "price": price,
                "stock": p.total_stock,
                "image": p.default_image,
            }
        ]
        out.append(
            {
                "id": p.id,
                "name": p.name,
                "image": p.default_image,
                "description": desc,
                "price": price,
                "compareAtPrice": float(p.compare_at_price) if p.compare_at_price is not None else None,
                "rating": float(p.rating_avg),
                "reviews": p.review_count,
                "categoryId": p.category_id,
                "discount": p.discount_label,
                "brand": p.brand,
                "jewelryType": str(p.jewelry_type) if p.jewelry_type is not None else None,
                "genderTarget": str(p.gender_target) if p.gender_target is not None else None,
                "totalStock": p.total_stock,
                "images": [i.url for i in imgs],
                "variants": var_list,
            }
        )
    return out


def get_product(db: Session, store_id: int, product_id: str) -> dict | None:
    p = db.execute(
        select(Product).where(
            Product.store_id == store_id,
            Product.id == product_id,
            Product.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if not p:
        return None
    price = _master_price(p)
    variants = db.execute(
        select(ProductVariant)
        .where(
            ProductVariant.store_id == store_id,
            ProductVariant.product_id == product_id,
            ProductVariant.deleted_at.is_(None),
        )
        .order_by(ProductVariant.position)
    ).scalars().all()
    images = db.execute(
        select(ProductImage)
        .where(ProductImage.store_id == store_id, ProductImage.product_id == product_id)
        .order_by(ProductImage.position)
    ).scalars().all()
    var_list = [_serialize_variant(v, price) for v in variants] if variants else [
        {
            "id": f"{p.id}-default",
            "sku": p.id,
            "size": None,
            "color": None,
            "price": price,
            "stock": p.total_stock,
            "image": p.default_image,
        }
    ]
    return {
        "id": p.id,
        "name": p.name,
        "image": p.default_image,
        "description": p.description,
        "shortDescription": p.short_description,
        "price": price,
        "compareAtPrice": float(p.compare_at_price) if p.compare_at_price is not None else None,
        "rating": float(p.rating_avg),
        "reviews": p.review_count,
        "categoryId": p.category_id,
        "discount": p.discount_label,
        "currency": str(p.currency).strip(),
        "brand": p.brand,
        "jewelryType": str(p.jewelry_type) if p.jewelry_type is not None else None,
        "material": p.material,
        "karat": p.karat,
        "gemstone": p.gemstone,
        "gemstoneQuality": str(p.gemstone_carat) if p.gemstone_carat is not None else None,
        "finish": str(p.finish) if p.finish is not None else None,
        "chainLengthCm": float(p.chain_length_cm) if p.chain_length_cm is not None else None,
        "hypoallergenic": p.hypoallergenic,
        "occasion": p.occasion,
        "genderTarget": str(p.gender_target) if p.gender_target is not None else None,
        "totalStock": p.total_stock,
        "images": [i.url for i in images],
        "variants": var_list,
        "attributes": p.attributes if p.attributes else None,
    }
