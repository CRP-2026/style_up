from __future__ import annotations

from decimal import Decimal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
import os
from app.core.database import get_db
from app.core.deps import get_current_user, get_store_id
from app.db.models import Order, User as UserRow
from app.features.orders import service as orders_svc

router = APIRouter()

BANK_ID = os.getenv("BANK_ID", "ICB")
ACCOUNT_NO = os.getenv("ACCOUNT_NO", "123456789")
ACCOUNT_NAME = os.getenv("ACCOUNT_NAME", "VO TAN DUC")


@router.get("/qr/{order_id}")
def get_payment_qr(
    order_id: str,
    db: Session = Depends(get_db),
    store_id: int = Depends(get_store_id),
    current: UserRow = Depends(get_current_user),
) -> dict:
    order = db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.store_id == store_id,
            Order.user_id == current.id,
        )
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    amount = int(Decimal(str(order.total)))
    transfer_content = order.id
    qr_url = (
        f"https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png"
        f"?amount={amount}&addInfo={quote(transfer_content, safe='')}&accountName={quote(ACCOUNT_NAME, safe='')}"
    )

    return {
        "order_id": order.id,
        "order_code": order.code,
        "amount": amount,
        "transfer_content": transfer_content,
        "qr_url": qr_url,
        "account_name": ACCOUNT_NAME,
        "account_no": ACCOUNT_NO,
        "bank_id": BANK_ID,
        "status": str(order.status),
        "payment_status": str(order.payment_status),
    }


@router.post("/mock-success/{order_id}")
def mock_success(
    order_id: str,
    db: Session = Depends(get_db),
    store_id: int = Depends(get_store_id),
    current: UserRow = Depends(get_current_user),
) -> dict:
    return orders_svc.mark_order_paid_mock(db, store_id, current.id, order_id)