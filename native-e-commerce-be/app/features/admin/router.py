from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_admin_user, get_staff_or_admin_user, get_store_id
from app.core.exceptions import AppError
from app.db.models import (
    InventoryAdjustment,
    Category,
    Order,
    OrderItem,
    Product,
    ProductVariant,
    PromoCode,
    PromoRedemption,
    User,
)
from app.db.models import User as UserRow
from app.features.orders import service as orders_svc
from app.features.orders.schemas import OrderStatusUpdateIn
from app.features.users import service as users_svc
from app.features.users.schemas import AdminUserActiveIn, AdminUserRoleIn, UserOut

router = APIRouter()

MEDIA_ROOT = Path(__file__).resolve().parents[3] / "media" / "uploads"


def _serialize_user(row: User) -> UserOut:
    return UserOut(
        id=row.id,
        name=row.name,
        email=row.email,
        phone=row.phone,
        avatar=row.avatar,
        bio=row.bio,
        is_active=row.is_active,
        role=str(row.role),
    )


# ----------------------------- USERS -----------------------------------------


@router.patch("/users/{user_id}/status", response_model=UserOut)
def patch_user_active_status(
    user_id: str,
    payload: AdminUserActiveIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> UserOut:
    row = users_svc.admin_set_user_active(
        db,
        store_id,
        user_id,
        is_active=payload.is_active,
        actor_user_id=admin.id,
    )
    return _serialize_user(row)


@router.get("/users", response_model=list[UserOut])
def admin_list_users(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
    role: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[UserOut]:
    rows = users_svc.admin_list_users(
        db,
        store_id,
        role=role,
        is_active=is_active,
        q=q,
        limit=limit,
        offset=offset,
    )
    return [_serialize_user(row) for row in rows]


@router.patch("/users/{user_id}/role", response_model=UserOut)
def patch_user_role(
    user_id: str,
    payload: AdminUserRoleIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> UserOut:
    row = users_svc.admin_set_user_role(
        db,
        store_id,
        user_id,
        role=payload.role,
        actor_user_id=admin.id,
    )
    return _serialize_user(row)


# ----------------------------- CATEGORIES ------------------------------------


class CategoryCreateIn(BaseModel):
    id: str
    label: str
    slug: str
    image: str | None = None
    parent_id: str | None = Field(default=None, alias="parentId")
    model_config = {"populate_by_name": True}


class CategoryUpdateIn(BaseModel):
    label: str | None = None
    slug: str | None = None
    image: str | None = None
    parent_id: str | None = Field(default=None, alias="parentId")
    model_config = {"populate_by_name": True}


@router.get("/categories")
def admin_list_categories(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
) -> list[dict]:
    rows = db.execute(
        select(Category)
        .where(Category.store_id == store_id, Category.deleted_at.is_(None))
        .order_by(Category.label.asc())
    ).scalars().all()
    return [
        {
            "id": c.id,
            "label": c.label,
            "slug": c.slug,
            "image": c.image or "",
            "parentId": c.parent_id,
            "createdAt": c.created_at.replace(tzinfo=timezone.utc).isoformat(),
            "updatedAt": c.updated_at.replace(tzinfo=timezone.utc).isoformat(),
        }
        for c in rows
    ]


@router.post("/categories")
def admin_create_category(
    payload: CategoryCreateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(Category).where(
            Category.store_id == store_id,
            (Category.id == payload.id) | (Category.slug == payload.slug),
        )
    ).scalar_one_or_none()
    if row is not None:
        raise AppError("conflict", "Category id/slug already exists", status_code=409)
    db.add(
        Category(
            store_id=store_id,
            id=payload.id.strip(),
            label=payload.label.strip(),
            slug=payload.slug.strip(),
            image=payload.image.strip() if payload.image else None,
            parent_id=payload.parent_id.strip() if payload.parent_id else None,
        )
    )
    db.commit()
    return {"id": payload.id}


@router.patch("/categories/{category_id}")
def admin_update_category(
    category_id: str,
    payload: CategoryUpdateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(Category)
        .where(Category.store_id == store_id, Category.id == category_id, Category.deleted_at.is_(None))
        .with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Category not found", status_code=404)
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    if "slug" in data and data["slug"]:
        exists = db.execute(
            select(Category).where(
                Category.store_id == store_id,
                Category.slug == data["slug"],
                Category.id != category_id,
                Category.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if exists is not None:
            raise AppError("conflict", "Category slug already exists", status_code=409)
    for k, v in data.items():
        setattr(row, k, v.strip() if isinstance(v, str) else v)
    db.commit()
    return {"id": row.id}


@router.delete("/categories/{category_id}")
def admin_delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(Category)
        .where(Category.store_id == store_id, Category.id == category_id, Category.deleted_at.is_(None))
        .with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Category not found", status_code=404)
    row.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": row.id, "deleted": True}


# ----------------------------- ORDERS ----------------------------------------


@router.get("/orders")
def admin_list_orders(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
    status: str | None = Query(default=None),
    payment_status: str | None = Query(default=None),
    code: str | None = Query(default=None),
    receiver: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    return orders_svc.list_orders_admin(
        db,
        store_id,
        status=status,
        payment_status=payment_status,
        code=code,
        receiver=receiver,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )


@router.get("/orders/{order_id}")
def admin_get_order(
    order_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
) -> dict:
    row = orders_svc.get_order_detail(db, store_id, None, order_id)
    if row is None:
        raise AppError("not_found", "Order not found", status_code=404)
    return row


@router.patch("/orders/{order_id}/status")
def admin_update_order_status(
    order_id: str,
    payload: OrderStatusUpdateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
) -> dict:
    return orders_svc.update_order_status(
        db,
        store_id,
        order_id,
        new_status=payload.status,
        actor_user_id=admin.id,
        user_id_filter=None,
        note=payload.note,
        tracking_number=payload.tracking_number,
    )


# ----------------------------- VARIANT STOCK ---------------------------------


class VariantStockIn(BaseModel):
    stock: int = Field(ge=0)
    reason: str | None = Field(default=None, max_length=500)


class VariantBulkStockItemIn(BaseModel):
    variant_id: str = Field(alias="variantId")
    stock: int = Field(ge=0)
    reason: str | None = Field(default=None, max_length=500)
    model_config = {"populate_by_name": True}


class VariantBulkStockIn(BaseModel):
    items: list[VariantBulkStockItemIn] = Field(min_length=1, max_length=200)


@router.patch("/variants/{variant_id}/stock")
def admin_set_variant_stock(
    variant_id: str,
    payload: VariantStockIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
) -> dict:
    v = db.execute(
        select(ProductVariant)
        .where(
            ProductVariant.store_id == store_id,
            ProductVariant.id == variant_id,
            ProductVariant.deleted_at.is_(None),
        )
        .with_for_update()
    ).scalar_one_or_none()
    if v is None:
        raise AppError("not_found", "Variant not found", status_code=404)

    before = v.stock
    delta = payload.stock - before
    v.stock = payload.stock

    p = db.execute(
        select(Product)
        .where(Product.store_id == store_id, Product.id == v.product_id)
        .with_for_update()
    ).scalar_one_or_none()
    if p is not None:
        p.total_stock = max(0, p.total_stock + delta)

    db.add(
        InventoryAdjustment(
            id=str(uuid.uuid4()),
            store_id=store_id,
            product_id=v.product_id,
            variant_id=v.id,
            before_stock=before,
            after_stock=v.stock,
            reason=payload.reason,
            actor_user_id=admin.id,
        )
    )
    db.commit()
    return {
        "id": v.id,
        "productId": v.product_id,
        "size": v.size,
        "color": v.color,
        "stock": v.stock,
    }


@router.post("/variants/bulk-stock")
def admin_bulk_set_variant_stock(
    payload: VariantBulkStockIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
) -> dict:
    updated = 0
    for item in payload.items:
        v = db.execute(
            select(ProductVariant)
            .where(
                ProductVariant.store_id == store_id,
                ProductVariant.id == item.variant_id,
                ProductVariant.deleted_at.is_(None),
            )
            .with_for_update()
        ).scalar_one_or_none()
        if v is None:
            continue
        before = v.stock
        delta = item.stock - before
        v.stock = item.stock
        p = db.execute(
            select(Product)
            .where(Product.store_id == store_id, Product.id == v.product_id)
            .with_for_update()
        ).scalar_one_or_none()
        if p is not None:
            p.total_stock = max(0, p.total_stock + delta)
        db.add(
            InventoryAdjustment(
                id=str(uuid.uuid4()),
                store_id=store_id,
                product_id=v.product_id,
                variant_id=v.id,
                before_stock=before,
                after_stock=v.stock,
                reason=item.reason or "bulk_update",
                actor_user_id=admin.id,
            )
        )
        updated += 1
    db.commit()
    return {"updatedCount": updated}


@router.get("/inventory/adjustments")
def admin_list_inventory_adjustments(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
    variant_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    stmt = select(InventoryAdjustment).where(InventoryAdjustment.store_id == store_id)
    if variant_id:
        stmt = stmt.where(InventoryAdjustment.variant_id == variant_id)
    stmt = stmt.order_by(InventoryAdjustment.created_at.desc()).offset(offset).limit(limit)
    rows = db.execute(stmt).scalars().all()
    return [
        {
            "id": r.id,
            "productId": r.product_id,
            "variantId": r.variant_id,
            "beforeStock": r.before_stock,
            "afterStock": r.after_stock,
            "reason": r.reason,
            "actorUserId": r.actor_user_id,
            "createdAt": r.created_at.replace(tzinfo=timezone.utc).isoformat(),
        }
        for r in rows
    ]


# ----------------------------- PRODUCT TOGGLE --------------------------------


class ProductActiveIn(BaseModel):
    is_active: bool = Field(alias="isActive")
    model_config = {"populate_by_name": True}


class ProductCreateIn(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    default_image: str = Field(alias="defaultImage")
    base_price: Decimal = Field(alias="basePrice", ge=0)
    category_id: str | None = Field(default=None, alias="categoryId")
    short_description: str | None = Field(default=None, alias="shortDescription")
    brand: str | None = None
    is_active: bool = Field(default=True, alias="isActive")
    model_config = {"populate_by_name": True}


class ProductUpdateIn(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    default_image: str | None = Field(default=None, alias="defaultImage")
    base_price: Decimal | None = Field(default=None, alias="basePrice", ge=0)
    category_id: str | None = Field(default=None, alias="categoryId")
    short_description: str | None = Field(default=None, alias="shortDescription")
    brand: str | None = None
    is_active: bool | None = Field(default=None, alias="isActive")
    model_config = {"populate_by_name": True}


class VariantCreateIn(BaseModel):
    id: str
    sku: str
    size: str | None = None
    color: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    stock: int = Field(ge=0)
    image: str | None = None


class VariantUpdateIn(BaseModel):
    sku: str | None = None
    size: str | None = None
    color: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    image: str | None = None


@router.patch("/products/{product_id}/active")
def admin_toggle_product_active(
    product_id: str,
    payload: ProductActiveIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    p = db.execute(
        select(Product)
        .where(
            Product.store_id == store_id,
            Product.id == product_id,
            Product.deleted_at.is_(None),
        )
        .with_for_update()
    ).scalar_one_or_none()
    if p is None:
        raise AppError("not_found", "Product not found", status_code=404)
    p.is_active = payload.is_active
    db.commit()
    return {"id": p.id, "isActive": p.is_active}


@router.get("/products")
def admin_list_products(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
    q: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    low_stock: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    stmt = select(Product).where(Product.store_id == store_id, Product.deleted_at.is_(None))
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Product.name.ilike(like)) | (Product.slug.ilike(like)))
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if is_active is not None:
        stmt = stmt.where(Product.is_active.is_(is_active))
    if low_stock:
        stmt = stmt.where(Product.total_stock <= 5)
    stmt = stmt.order_by(Product.updated_at.desc()).offset(offset).limit(limit)
    rows = db.execute(stmt).scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "categoryId": p.category_id,
            "basePrice": float(p.base_price),
            "totalStock": p.total_stock,
            "isActive": p.is_active,
            "defaultImage": p.default_image,
            "brand": p.brand,
            "updatedAt": p.updated_at.replace(tzinfo=timezone.utc).isoformat(),
        }
        for p in rows
    ]


@router.get("/products/{product_id}")
def admin_get_product(
    product_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
) -> dict:
    p = db.execute(
        select(Product).where(
            Product.store_id == store_id,
            Product.id == product_id,
            Product.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if p is None:
        raise AppError("not_found", "Product not found", status_code=404)
    variants = db.execute(
        select(ProductVariant)
        .where(
            ProductVariant.store_id == store_id,
            ProductVariant.product_id == product_id,
            ProductVariant.deleted_at.is_(None),
        )
        .order_by(ProductVariant.created_at.asc())
    ).scalars().all()
    return {
        "id": p.id,
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "defaultImage": p.default_image,
        "basePrice": float(p.base_price),
        "categoryId": p.category_id,
        "brand": p.brand,
        "isActive": p.is_active,
        "totalStock": p.total_stock,
        "variants": [
            {
                "id": v.id,
                "sku": v.sku,
                "size": v.size,
                "color": v.color,
                "price": float(v.price) if v.price is not None else None,
                "stock": v.stock,
                "image": v.image,
            }
            for v in variants
        ],
    }


@router.post("/products")
def admin_create_product(
    payload: ProductCreateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    exists = db.execute(
        select(Product).where(Product.store_id == store_id, (Product.id == payload.id) | (Product.slug == payload.slug))
    ).scalar_one_or_none()
    if exists is not None:
        raise AppError("conflict", "Product id/slug already exists", status_code=409)
    row = Product(
        store_id=store_id,
        id=payload.id,
        category_id=payload.category_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        short_description=payload.short_description,
        default_image=payload.default_image,
        base_price=payload.base_price,
        total_stock=0,
        brand=payload.brand,
        is_active=payload.is_active,
    )
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.patch("/products/{product_id}")
def admin_update_product(
    product_id: str,
    payload: ProductUpdateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(Product)
        .where(Product.store_id == store_id, Product.id == product_id, Product.deleted_at.is_(None))
        .with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Product not found", status_code=404)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    return {"id": row.id}


@router.delete("/products/{product_id}")
def admin_soft_delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(Product)
        .where(Product.store_id == store_id, Product.id == product_id, Product.deleted_at.is_(None))
        .with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Product not found", status_code=404)
    row.deleted_at = datetime.now(timezone.utc)
    row.is_active = False
    db.commit()
    return {"id": row.id, "deleted": True}


@router.post("/products/{product_id}/variants")
def admin_create_variant(
    product_id: str,
    payload: VariantCreateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    product = db.execute(
        select(Product)
        .where(Product.store_id == store_id, Product.id == product_id, Product.deleted_at.is_(None))
        .with_for_update()
    ).scalar_one_or_none()
    if product is None:
        raise AppError("not_found", "Product not found", status_code=404)
    existing = db.execute(
        select(ProductVariant).where(ProductVariant.store_id == store_id, ProductVariant.id == payload.id)
    ).scalar_one_or_none()
    if existing is not None:
        raise AppError("conflict", "Variant id already exists", status_code=409)
    row = ProductVariant(
        store_id=store_id,
        id=payload.id,
        product_id=product_id,
        sku=payload.sku,
        size=payload.size,
        color=payload.color,
        price=payload.price,
        stock=payload.stock,
        image=payload.image,
    )
    product.total_stock = max(0, product.total_stock + payload.stock)
    db.add(row)
    # Ensure variant row exists before writing adjustment FK(store_id, variant_id).
    db.flush()
    db.add(
        InventoryAdjustment(
            id=str(uuid.uuid4()),
            store_id=store_id,
            product_id=product_id,
            variant_id=payload.id,
            before_stock=0,
            after_stock=payload.stock,
            reason="variant_create",
            actor_user_id=admin.id,
        )
    )
    db.commit()
    return {"id": row.id}


@router.patch("/variants/{variant_id}")
def admin_update_variant(
    variant_id: str,
    payload: VariantUpdateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(ProductVariant)
        .where(ProductVariant.store_id == store_id, ProductVariant.id == variant_id, ProductVariant.deleted_at.is_(None))
        .with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Variant not found", status_code=404)
    product = db.execute(
        select(Product).where(Product.store_id == store_id, Product.id == row.product_id).with_for_update()
    ).scalar_one_or_none()
    before_stock = row.stock
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    if "stock" in data and product is not None:
        product.total_stock = max(0, product.total_stock + (row.stock - before_stock))
        db.add(
            InventoryAdjustment(
                id=str(uuid.uuid4()),
                store_id=store_id,
                product_id=row.product_id,
                variant_id=row.id,
                before_stock=before_stock,
                after_stock=row.stock,
                reason="variant_update",
                actor_user_id=admin.id,
            )
        )
    db.commit()
    return {"id": row.id}


class PromoCreateIn(BaseModel):
    code: str
    discount_type: str = Field(alias="discountType")
    discount_value: Decimal = Field(alias="discountValue", ge=0)
    max_discount: Decimal | None = Field(default=None, alias="maxDiscount", ge=0)
    min_order_total: Decimal = Field(default=Decimal("0"), alias="minOrderTotal", ge=0)
    usage_limit: int | None = Field(default=None, alias="usageLimit", ge=1)
    starts_at: datetime | None = Field(default=None, alias="startsAt")
    ends_at: datetime | None = Field(default=None, alias="endsAt")
    is_active: bool = Field(default=True, alias="isActive")
    model_config = {"populate_by_name": True}


class PromoUpdateIn(BaseModel):
    discount_type: str | None = Field(default=None, alias="discountType")
    discount_value: Decimal | None = Field(default=None, alias="discountValue", ge=0)
    max_discount: Decimal | None = Field(default=None, alias="maxDiscount", ge=0)
    min_order_total: Decimal | None = Field(default=None, alias="minOrderTotal", ge=0)
    usage_limit: int | None = Field(default=None, alias="usageLimit", ge=1)
    starts_at: datetime | None = Field(default=None, alias="startsAt")
    ends_at: datetime | None = Field(default=None, alias="endsAt")
    is_active: bool | None = Field(default=None, alias="isActive")
    model_config = {"populate_by_name": True}


@router.get("/promos")
def admin_list_promos(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> list[dict]:
    rows = db.execute(
        select(PromoCode).where(PromoCode.store_id == store_id).order_by(PromoCode.created_at.desc())
    ).scalars().all()
    return [
        {
            "id": p.id,
            "code": p.code,
            "discountType": p.discount_type,
            "discountValue": float(p.discount_value),
            "maxDiscount": float(p.max_discount) if p.max_discount is not None else None,
            "minOrderTotal": float(p.min_order_total),
            "usageLimit": p.usage_limit,
            "usedCount": p.used_count,
            "isActive": p.is_active,
            "startsAt": p.starts_at.replace(tzinfo=timezone.utc).isoformat() if p.starts_at else None,
            "endsAt": p.ends_at.replace(tzinfo=timezone.utc).isoformat() if p.ends_at else None,
        }
        for p in rows
    ]


@router.post("/promos")
def admin_create_promo(
    payload: PromoCreateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    if payload.discount_type not in {"fixed", "percent"}:
        raise AppError("bad_request", "discountType must be fixed|percent", status_code=400)
    row = PromoCode(
        id=str(uuid.uuid4()),
        store_id=store_id,
        code=payload.code.strip().upper(),
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        max_discount=payload.max_discount,
        min_order_total=payload.min_order_total,
        usage_limit=payload.usage_limit,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        is_active=payload.is_active,
    )
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.patch("/promos/{promo_id}")
def admin_update_promo(
    promo_id: str,
    payload: PromoUpdateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(PromoCode)
        .where(PromoCode.id == promo_id, PromoCode.store_id == store_id)
        .with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Promo not found", status_code=404)
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    if "discount_type" in data and data["discount_type"] not in {"fixed", "percent"}:
        raise AppError("bad_request", "discountType must be fixed|percent", status_code=400)
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    return {"id": row.id}


@router.patch("/promos/{promo_id}/active")
def admin_set_promo_active(
    promo_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    if "isActive" not in payload and "is_active" not in payload:
        raise AppError("bad_request", "Missing isActive", status_code=400)
    is_active = bool(payload.get("isActive", payload.get("is_active")))
    row = db.execute(
        select(PromoCode)
        .where(PromoCode.id == promo_id, PromoCode.store_id == store_id)
        .with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Promo not found", status_code=404)
    row.is_active = is_active
    db.commit()
    return {"id": row.id, "isActive": row.is_active}


@router.post("/promos/{promo_id}/archive")
def admin_archive_promo(
    promo_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(PromoCode)
        .where(PromoCode.id == promo_id, PromoCode.store_id == store_id)
        .with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Promo not found", status_code=404)
    row.is_active = False
    db.commit()
    return {"id": row.id, "archived": True}


@router.delete("/promos/{promo_id}")
def admin_delete_promo(
    promo_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_admin_user),
) -> dict:
    row = db.execute(
        select(PromoCode).where(PromoCode.id == promo_id, PromoCode.store_id == store_id).with_for_update()
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "Promo not found", status_code=404)
    if int(row.used_count or 0) > 0:
        # tránh mất lịch sử; chuyển thành archive
        row.is_active = False
        db.commit()
        return {"id": row.id, "deleted": False, "archived": True}
    db.delete(row)
    db.commit()
    return {"id": promo_id, "deleted": True}


@router.get("/promos/{promo_id}/usages")
def admin_promo_usages(
    promo_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    promo = db.execute(
        select(PromoCode).where(PromoCode.id == promo_id, PromoCode.store_id == store_id)
    ).scalar_one_or_none()
    if promo is None:
        raise AppError("not_found", "Promo not found", status_code=404)
    rows = db.execute(
        select(PromoRedemption, Order.code, Order.user_id)
        .join(Order, Order.id == PromoRedemption.order_id)
        .where(PromoRedemption.store_id == store_id, PromoRedemption.promo_id == promo_id)
        .order_by(PromoRedemption.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [
        {
            "id": r.PromoRedemption.id,
            "orderId": r.PromoRedemption.order_id,
            "orderCode": r.code,
            "userId": r.user_id,
            "discountApplied": float(r.PromoRedemption.discount_applied),
            "createdAt": r.PromoRedemption.created_at.replace(tzinfo=timezone.utc).isoformat(),
        }
        for r in rows
    ]


# ----------------------------- MEDIA -----------------------------------------


@router.post("/media/upload")
async def admin_upload_media(
    request: Request,
    file: UploadFile = File(...),
    folder: str = Query(default="products"),
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
) -> dict:
    content_type = (file.content_type or "").lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise AppError("bad_request", "Only jpeg/png/webp supported", status_code=400)
    ext = ".jpg"
    if content_type == "image/png":
        ext = ".png"
    elif content_type == "image/webp":
        ext = ".webp"
    safe_folder = "".join(ch for ch in folder if ch.isalnum() or ch in {"-", "_"}) or "products"
    out_dir = MEDIA_ROOT / safe_folder
    out_dir.mkdir(parents=True, exist_ok=True)
    name = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:10]}{ext}"
    out_path = out_dir / name
    data = await file.read()
    if not data:
        raise AppError("bad_request", "Empty file", status_code=400)
    out_path.write_bytes(data)
    base = str(request.base_url).rstrip("/")
    rel = f"/media/uploads/{safe_folder}/{name}"
    return {"url": f"{base}{rel}", "path": rel}


@router.get("/dashboard/summary")
def admin_dashboard_summary(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
) -> dict:
    total_orders = db.execute(
        select(func.count(Order.id)).where(Order.store_id == store_id)
    ).scalar_one()
    revenue = db.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.store_id == store_id,
            Order.status.in_(["processing", "shipped", "delivered"]),  # type: ignore[arg-type]
        )
    ).scalar_one()
    active_products = db.execute(
        select(func.count(Product.id)).where(
            Product.store_id == store_id, Product.deleted_at.is_(None), Product.is_active.is_(True)
        )
    ).scalar_one()
    low_stock_variants = db.execute(
        select(func.count(ProductVariant.id)).where(
            ProductVariant.store_id == store_id,
            ProductVariant.deleted_at.is_(None),
            ProductVariant.stock <= 5,
        )
    ).scalar_one()
    return {
        "totalOrders": int(total_orders or 0),
        "revenue": float(revenue or 0),
        "activeProducts": int(active_products or 0),
        "lowStockVariants": int(low_stock_variants or 0),
    }


@router.get("/dashboard/revenue")
def admin_dashboard_revenue(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
    days: int = Query(default=7, ge=1, le=90),
) -> list[dict]:
    rows = db.execute(
        select(
            func.date_trunc("day", Order.placed_at).label("day"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .where(
            Order.store_id == store_id,
            Order.placed_at >= datetime.now(timezone.utc) - timedelta(days=days),
        )
        .group_by(func.date_trunc("day", Order.placed_at))
        .order_by(func.date_trunc("day", Order.placed_at))
    ).all()
    return [
        {
            "day": day.replace(tzinfo=timezone.utc).date().isoformat(),
            "revenue": float(revenue or 0),
            "orders": int(orders or 0),
        }
        for day, revenue, orders in rows
    ]


@router.get("/dashboard/top-products")
def admin_dashboard_top_products(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    admin: UserRow = Depends(get_staff_or_admin_user),
    limit: int = Query(default=5, ge=1, le=20),
) -> list[dict]:
    rows = db.execute(
        select(
            OrderItem.product_id,
            func.max(OrderItem.name_snapshot).label("name"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("qty"),
            func.coalesce(func.sum(OrderItem.line_total), 0).label("revenue"),
        )
        .where(OrderItem.store_id == store_id, OrderItem.product_id.is_not(None))
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.line_total).desc())
        .limit(limit)
    ).all()
    return [
        {
            "productId": pid,
            "name": name,
            "quantity": int(qty or 0),
            "revenue": float(revenue or 0),
        }
        for pid, name, qty, revenue in rows
    ]
