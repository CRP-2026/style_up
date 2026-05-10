from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_store_id
from app.core.exceptions import AppError
from app.db.models import User as UserRow
from app.features.orders import service as orders_svc
from app.features.orders.schemas import OrderCancelIn, OrderCreateIn

router = APIRouter()

@router.get("/")
def list_orders(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
    status: str | None = None,
) -> list[dict]:
    return orders_svc.list_order_summaries(db, store_id, current.id, status=status)


@router.get("/{order_id}")
def order_detail(
    order_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
) -> dict:
    row = orders_svc.get_order_detail(db, store_id, current.id, order_id)
    if row is None:
        raise AppError("not_found", "Order not found", status_code=404)
    return row


@router.post("/create")
@router.post("/")
def place_order(
    payload: OrderCreateIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
) -> dict:
    return orders_svc.create_order(db, store_id, current.id, payload)


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: str,
    payload: OrderCancelIn = Body(default_factory=OrderCancelIn),
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
) -> dict:
    note = payload.note
    return orders_svc.update_order_status(
        db,
        store_id,
        order_id,
        new_status="cancelled",
        actor_user_id=current.id,
        user_id_filter=current.id,
        note=note,
    )
