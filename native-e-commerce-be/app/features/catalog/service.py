from __future__ import annotations

import base64
import json
import math
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

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
IMAGE_DOWNLOAD_TIMEOUT_SECONDS = 5
PHASH_CATALOG_CAP = 56
PHASH_MAX_WORKERS = 10
HF_CLIP_URL = os.getenv(
    "HF_CLIP_ENDPOINT",
    "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32",
)
HF_VIT_URL = os.getenv(
    "HF_VIT_ENDPOINT",
    "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224",
)
HF_CLIP_FALLBACK_URL = os.getenv(
    "HF_CLIP_FALLBACK_ENDPOINT",
    "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32",
)
HF_VIT_FALLBACK_URL = os.getenv(
    "HF_VIT_FALLBACK_ENDPOINT",
    "https://api-inference.huggingface.co/models/google/vit-base-patch16-224",
)

_META_CACHE: dict[str, object] = {"mtime": None, "items": [], "mode": "numeric"}


def _image_url_canonical(url: str) -> str:
    """Chuẩn hóa URL ảnh (bỏ query/fragment) để map metadata ↔ DB khi chỉ khác tham số ?w=."""
    u = (url or "").strip()
    if not u:
        return ""
    parsed = urlparse(u)
    netloc = (parsed.netloc or "").lower()
    path = (parsed.path or "").rstrip("/").lower()
    if not netloc and path.startswith("//"):
        inner = urlparse("https:" + path)
        netloc = (inner.netloc or "").lower()
        path = (inner.path or "").rstrip("/").lower()
    return f"{netloc}{path}" if netloc else path


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
    if isinstance(raw, dict):
        for key in ("embedding", "embeddings", "image_embedding", "vector", "data"):
            if key in raw:
                inner = _coerce_numeric_vector(raw[key])
                if inner is not None:
                    return inner
        return None
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


def _metadata_numeric_dim(meta_items: list[dict]) -> int | None:
    for item in meta_items:
        vec = item.get("numeric")
        if isinstance(vec, list) and vec and isinstance(vec[0], (int, float)):
            return len(vec)
    return None


def _is_nondegenerate_embedding(vec: list[float]) -> bool:
    if len(vec) < 8:
        return False
    return sum(abs(x) for x in vec) > 1e-12


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
        # Accept both 'id' and 'product_id' from JSON
        sid = str(it.get("id", it.get("product_id", ""))).strip()
        if not sid:
            continue
        vec = _coerce_numeric_vector(it.get("vector"))
        if vec is not None:
            parsed_items.append(
                {
                    "product_id": sid,
                    "id": sid,  # Keep both for compatibility
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
                    "id": sid,  # Keep both for compatibility
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


def _hf_infer_vector(
    image_base64: str,
    *,
    mode: str,
    expected_numeric_dim: int | None = None,
) -> object:
    token = os.getenv("HF_TOKEN", "").strip()
    if not token:
        raise ValueError("Missing HF_TOKEN in backend environment")
    endpoints = [
        HF_CLIP_URL if mode == "numeric" else HF_VIT_URL,
        HF_CLIP_FALLBACK_URL if mode == "numeric" else HF_VIT_FALLBACK_URL,
    ]
    endpoints = list(dict.fromkeys([e.strip() for e in endpoints if e and e.strip()]))

    # Decode base64 to binary
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        raise ValueError(f"Invalid base64 image: {e}")

    errors: list[str] = []
    for endpoint in endpoints:
        base_headers = {"Authorization": f"Bearer {token}"}
        request_attempts = [
            {
                "files": {"data": ("image.jpg", image_bytes, "image/jpeg")},
                "headers": base_headers,
            },
            {
                "data": image_bytes,
                "headers": {**base_headers, "Content-Type": "image/jpeg"},
            },
            {
                "json": {"inputs": f"data:image/jpeg;base64,{image_base64}"},
                "headers": {**base_headers, "Content-Type": "application/json"},
            },
        ]
        for attempt in request_attempts:
            try:
                resp = requests.post(endpoint, timeout=HF_TIMEOUT_SECONDS, **attempt)
                resp.raise_for_status()
                raw = resp.json()
                if mode == "numeric" and expected_numeric_dim is not None:
                    q = _coerce_numeric_vector(raw)
                    q_len = len(q) if q is not None else 0
                    if (
                        q is None
                        or q_len != expected_numeric_dim
                        or not _is_nondegenerate_embedding(q)
                    ):
                        errors.append(
                            f"{endpoint} [embedding-invalid] dim={q_len} expected={expected_numeric_dim}"
                        )
                        break
                return raw
            except requests.exceptions.HTTPError as e:
                text = e.response.text[:200] if e.response is not None and e.response.text else ""
                status = e.response.status_code if e.response is not None else "unknown"
                errors.append(f"{endpoint} [{status}] {text}".strip())
            except Exception as e:
                errors.append(f"{endpoint} [request-error] {e}")

    raise Exception("HF API error after endpoint/payload fallbacks: " + " | ".join(errors[:8]))


def _decode_search_image_base64(b64_in: str) -> bytes | None:
    """Giải mã base64 từ app (Expo), cho phép thiếu padding — tránh trả rỗng oan."""
    s = "".join((b64_in or "").split())
    low = s.lower()
    if "base64," in low:
        s = s.split("base64,", 1)[1].strip()
    if len(s) < 20:
        return None
    pad = (-len(s)) % 4
    if pad:
        s += "=" * pad
    try:
        return base64.b64decode(s, validate=False)
    except Exception:
        return None


def _search_products_by_image_embedding(
    db: Session,
    store_id: int,
    *,
    image_bytes: bytes,
    top_k: int,
) -> list[dict]:
    mode, meta_items = _load_metadata_vectors()
    if not meta_items:
        return []

    image_base64 = base64.b64encode(image_bytes).decode("ascii")
    meta_dim = _metadata_numeric_dim(meta_items) if mode == "numeric" else None

    query_raw = None
    q_vec = None
    q_labels = None

    try:
        query_raw = _hf_infer_vector(
            image_base64,
            mode=mode,
            expected_numeric_dim=meta_dim,
        )
        if mode == "numeric":
            q_vec = _coerce_numeric_vector(query_raw)
        else:
            q_labels = _coerce_label_scores(query_raw)
    except Exception as e:
        import sys

        print(f"⚠️  AI image search unavailable (HF): {e}", file=sys.stderr)
        return []

    if not q_vec and not q_labels:
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
                str(item.get("id", item.get("product_id", ""))),
                str(item.get("name", "")),
                str(item.get("image_url", "")),
            )
        )

    scored.sort(key=lambda x: x[0], reverse=True)
    best = scored[: max(1, int(top_k))]

    catalog_products = (
        db.execute(
            select(Product).where(
                Product.store_id == store_id,
                Product.deleted_at.is_(None),
            )
        )
        .scalars()
        .all()
    )
    by_id = {p.id: p for p in catalog_products}
    by_image_exact: dict[str, Product] = {}
    by_image_canon: dict[str, Product] = {}

    def _register_image_url(raw_url: str, owner: Product) -> None:
        u = str(raw_url or "").strip()
        if not u:
            return
        by_image_exact.setdefault(u, owner)
        ck = _image_url_canonical(u)
        if ck:
            by_image_canon.setdefault(ck, owner)

    for p in catalog_products:
        _register_image_url(str(p.default_image or ""), p)

    for row in db.execute(
        select(ProductImage.url, ProductImage.product_id).where(ProductImage.store_id == store_id)
    ).all():
        url, pid = row[0], row[1]
        parent = by_id.get(pid)
        if parent is not None:
            _register_image_url(str(url or ""), parent)

    for row in db.execute(
        select(ProductVariant.image, ProductVariant.product_id).where(
            ProductVariant.store_id == store_id,
            ProductVariant.deleted_at.is_(None),
        )
    ).all():
        vim, pid = row[0], row[1]
        if not vim:
            continue
        parent = by_id.get(pid)
        if parent is not None:
            _register_image_url(str(vim), parent)

    by_name = {str(p.name or "").strip().lower(): p for p in catalog_products if p.name}

    out: list[dict] = []
    seen_product_ids: set[str] = set()
    for score, sid, fallback_name, fallback_image in best:
        p = by_id.get(sid) or by_id.get(f"dim-{_slugify_local(sid)}")
        if p is None and fallback_image:
            fi = fallback_image.strip()
            p = by_image_exact.get(fi)
            if p is None:
                ck = _image_url_canonical(fi)
                if ck:
                    p = by_image_canon.get(ck)
        if p is None and fallback_name:
            p = by_name.get(fallback_name.strip().lower())
        if p is None and fallback_name:
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


def _search_products_by_image_phash(
    db: Session,
    store_id: int,
    *,
    image_bytes: bytes,
    top_k: int,
) -> list[dict]:
    """Fallback khi không có metadata/HF: so perceptual hash ảnh query với ảnh default của SP trong catalog."""
    try:
        import io

        import imagehash
        from PIL import Image
    except ImportError:
        return []

    try:
        q_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        q_hash = imagehash.phash(q_img)
    except Exception:
        return []

    rows = (
        db.execute(
            select(Product)
            .where(
                Product.store_id == store_id,
                Product.deleted_at.is_(None),
                Product.is_active.is_(True),
                Product.default_image.isnot(None),
            )
            .order_by(Product.rating_avg.desc().nullslast())
            .limit(PHASH_CATALOG_CAP)
        )
        .scalars()
        .all()
    )

    def _distance_for_product(p: Product) -> tuple[int, Product] | None:
        url = str(p.default_image or "").strip()
        if not url:
            return None
        try:
            r = requests.get(url, timeout=IMAGE_DOWNLOAD_TIMEOUT_SECONDS)
            r.raise_for_status()
            oh = imagehash.phash(Image.open(io.BytesIO(r.content)).convert("RGB"))
            return (int(q_hash - oh), p)
        except Exception:
            return None

    scored: list[tuple[int, Product]] = []
    workers = min(PHASH_MAX_WORKERS, max(1, len(rows)))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(_distance_for_product, p) for p in rows]
        for fut in as_completed(futures):
            row = fut.result()
            if row is not None:
                scored.append(row)

    scored.sort(key=lambda x: x[0])
    out: list[dict] = []
    seen: set[str] = set()
    tk = max(1, int(top_k))
    for dist, p in scored:
        if p.id in seen:
            continue
        seen.add(p.id)
        sim = max(0.0, 1.0 - float(dist) / 64.0)
        out.append(
            {
                "product_id": p.id,
                "name": p.name or "",
                "image": p.default_image,
                "price": _master_price(p),
                "score": round(sim, 6),
            }
        )
        if len(out) >= tk:
            break
    return out


def search_products_by_image(
    db: Session,
    store_id: int,
    *,
    image_base64: str,
    top_k: int = 10,
) -> list[dict]:
    blob = _decode_search_image_base64(image_base64)
    if blob is None:
        return []

    out = _search_products_by_image_embedding(db, store_id, image_bytes=blob, top_k=top_k)
    if out:
        return out[: max(1, int(top_k))]

    out = _search_products_by_image_phash(db, store_id, image_bytes=blob, top_k=top_k)
    return out[: max(1, int(top_k))]


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
