from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_store_id
from app.core.exceptions import AppError
from app.features.catalog import service as catalog_svc

router = APIRouter()


class ImageSearchRequest(BaseModel):
    image_base64: str = Field(min_length=20, description="JPEG/PNG base64 string without data URI prefix")
    top_k: int = Field(default=10, ge=1, le=20)


@router.get("/categories")
def categories(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
) -> list[dict]:
    return catalog_svc.list_categories(db, store_id)


@router.get("/products")
def products(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    category_id: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    search: str | None = Query(default=None),
    size: str | None = Query(default=None),
    color: str | None = Query(default=None),
    in_stock: bool | None = Query(default=None),
    sort: str | None = Query(
        default=None,
        description="newest | price_asc | price_desc | rating_desc | name_asc",
    ),
    limit: int = Query(default=24, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> dict:
    items = catalog_svc.list_products(
        db,
        store_id,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        search=search,
        size=size,
        color=color,
        in_stock=in_stock,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    total = catalog_svc.count_products(
        db,
        store_id,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        search=search,
        size=size,
        color=color,
        in_stock=in_stock,
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/products/{product_id}")
def product_detail(
    product_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
) -> dict:
    row = catalog_svc.get_product(db, store_id, product_id)
    if row is None:
        raise AppError("not_found", "Product not found", status_code=404)
    return row


@router.post("/products/search-by-image")
def search_by_image(
    payload: ImageSearchRequest,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
) -> dict:
    items = catalog_svc.search_products_by_image(
        db,
        store_id,
        image_base64=payload.image_base64,
        top_k=payload.top_k,
    )
    return {"items": items}
