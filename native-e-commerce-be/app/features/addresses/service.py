from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.db.models import Address
from app.features.addresses.schemas import AddressIn


def serialize(a: Address) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "phone": a.phone,
        "address": a.address,
        "city": a.city,
        "isDefault": a.is_default,
    }


def list_addresses(db: Session, store_id: int, user_id: str) -> list[dict]:
    rows = db.execute(
        select(Address).where(
            Address.store_id == store_id,
            Address.user_id == user_id,
            Address.deleted_at.is_(None),
        )
    ).scalars().all()
    return [serialize(r) for r in rows]


def get_address(db: Session, store_id: int, user_id: str, address_id: str) -> Address | None:
    return db.execute(
        select(Address).where(
            Address.id == address_id,
            Address.store_id == store_id,
            Address.user_id == user_id,
            Address.deleted_at.is_(None),
        )
    ).scalar_one_or_none()


def _unset_defaults(db: Session, store_id: int, user_id: str) -> None:
    rows = db.execute(
        select(Address).where(
            Address.store_id == store_id,
            Address.user_id == user_id,
            Address.deleted_at.is_(None),
            Address.is_default.is_(True),
        )
    ).scalars().all()
    now = datetime.now(timezone.utc)
    for r in rows:
        r.is_default = False
        r.updated_at = now


def create_address(db: Session, store_id: int, user_id: str, payload: AddressIn) -> Address:
    if payload.is_default:
        _unset_defaults(db, store_id, user_id)
    uid = str(uuid.uuid4())
    row = Address(
        id=uid,
        store_id=store_id,
        user_id=user_id,
        name=payload.name,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        is_default=payload.is_default,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_address(
    db: Session, store_id: int, user_id: str, address_id: str, payload: AddressIn
) -> Address:
    row = get_address(db, store_id, user_id, address_id)
    if row is None:
        raise AppError("not_found", "Address not found", status_code=404)
    if payload.is_default:
        _unset_defaults(db, store_id, user_id)
    row.name = payload.name
    row.phone = payload.phone
    row.address = payload.address
    row.city = payload.city
    row.is_default = payload.is_default
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


def delete_address(db: Session, store_id: int, user_id: str, address_id: str) -> None:
    row = get_address(db, store_id, user_id, address_id)
    if row is None:
        raise AppError("not_found", "Address not found", status_code=404)
    row.deleted_at = datetime.now(timezone.utc)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
