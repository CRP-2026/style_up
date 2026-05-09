from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import AppError
from app.core.security import decode_access_token
from app.db.models import User
from app.features.auth import service as auth_svc


def get_store_id(x_store_id: Annotated[str | None, Header(alias="X-Store-Id")] = None) -> int:
    if x_store_id is None:
        return 1
    try:
        v = int(x_store_id)
        if v < 1:
            raise ValueError
        return v
    except ValueError as e:
        raise AppError("bad_request", "Invalid X-Store-Id header", status_code=400, details={"reason": str(e)}) from e


def get_token_payload(authorization: Annotated[str | None, Header()] = None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(
            "unauthorized",
            "Missing or invalid Authorization header",
            status_code=401,
        )
    token = authorization.split(" ", 1)[1].strip()
    return decode_access_token(token)


def get_current_user(
    db: Session = Depends(get_db),
    store_id: int = Depends(get_store_id),
    payload: dict = Depends(get_token_payload),
) -> User:
    auth_svc.ensure_access_token_not_revoked(db, payload)
    sid = payload.get("sid")
    if sid is not None and int(sid) != store_id:
        raise AppError("forbidden", "Token store does not match X-Store-Id", status_code=403)
    user_id = payload.get("sub")
    if not user_id:
        raise AppError("unauthorized", "Invalid token", status_code=401)
    row = db.execute(
        select(User).where(
            User.id == str(user_id),
            User.store_id == store_id,
            User.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if row is None:
        raise AppError("unauthorized", "User not found", status_code=401)
    if not row.is_active:
        raise AppError(
            "account_inactive",
            "Tài khoản đã bị dừng hoạt động.",
            status_code=403,
        )
    return row


def get_admin_user(current: User = Depends(get_current_user)) -> User:
    if str(current.role) != "admin":
        raise AppError("forbidden", "Chỉ tài khoản admin mới thực hiện được thao tác này.", status_code=403)
    return current


def get_staff_or_admin_user(current: User = Depends(get_current_user)) -> User:
    role = str(current.role)
    if role not in {"staff", "admin"}:
        raise AppError("forbidden", "Chỉ tài khoản staff/admin mới thực hiện được thao tác này.", status_code=403)
    return current
