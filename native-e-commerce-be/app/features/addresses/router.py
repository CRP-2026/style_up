from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_store_id
from app.core.exceptions import AppError
from app.db.models import User as UserRow
from app.features.addresses import service as addr_svc
from app.features.addresses.schemas import AddressIn, AddressOut

router = APIRouter()


@router.get("/", response_model=list[AddressOut])
def list_addrs(
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
) -> list[AddressOut]:
    return [AddressOut.model_validate(a) for a in addr_svc.list_addresses(db, store_id, current.id)]


@router.get("/{address_id}", response_model=AddressOut)
def get_addr(
    address_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
) -> AddressOut:
    row = addr_svc.get_address(db, store_id, current.id, address_id)
    if row is None:
        raise AppError("not_found", "Address not found", status_code=404)
    return AddressOut.model_validate(addr_svc.serialize(row))


@router.post("/", response_model=AddressOut)
def create_addr(
    payload: AddressIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
) -> AddressOut:
    row = addr_svc.create_address(db, store_id, current.id, payload)
    return AddressOut.model_validate(addr_svc.serialize(row))


@router.put("/{address_id}", response_model=AddressOut)
def update_addr(
    address_id: str,
    payload: AddressIn,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
) -> AddressOut:
    row = addr_svc.update_address(db, store_id, current.id, address_id, payload)
    return AddressOut.model_validate(addr_svc.serialize(row))


@router.delete("/{address_id}")
def delete_addr(
    address_id: str,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
    current: UserRow = Depends(get_current_user),
) -> dict:
    addr_svc.delete_address(db, store_id, current.id, address_id)
    return {"deleted": True}
