from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.db.models import User
from app.features.users.schemas import UserUpdateIn


def update_profile(db: Session, store_id: int, user_id: str, payload: UserUpdateIn) -> User:
    row = db.execute(
        select(User).where(
            User.id == user_id,
            User.store_id == store_id,
            User.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "User not found", status_code=404)
    data = payload.model_dump(exclude_unset=True)
    for key, val in data.items():
        setattr(row, key, val)
    db.commit()
    db.refresh(row)
    return row


def admin_set_user_active(
    db: Session,
    store_id: int,
    target_user_id: str,
    *,
    is_active: bool,
    actor_user_id: str,
) -> User:
    if target_user_id == actor_user_id and not is_active:
        raise AppError("bad_request", "You cannot deactivate your own account", status_code=400)
    row = db.execute(
        select(User).where(
            User.id == target_user_id,
            User.store_id == store_id,
            User.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "User not found", status_code=404)
    row.is_active = is_active
    db.commit()
    db.refresh(row)
    return row


def admin_set_user_role(
    db: Session,
    store_id: int,
    target_user_id: str,
    *,
    role: str,
    actor_user_id: str,
) -> User:
    if target_user_id == actor_user_id and role != "admin":
        raise AppError("bad_request", "Bạn không thể tự hạ quyền của chính mình", status_code=400)
    row = db.execute(
        select(User).where(
            User.id == target_user_id,
            User.store_id == store_id,
            User.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if row is None:
        raise AppError("not_found", "User not found", status_code=404)
    row.role = role
    db.commit()
    db.refresh(row)
    return row


def admin_list_users(
    db: Session,
    store_id: int,
    *,
    role: str | None,
    is_active: bool | None,
    q: str | None,
    limit: int,
    offset: int,
) -> list[User]:
    stmt = select(User).where(User.store_id == store_id, User.deleted_at.is_(None))
    if role:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))
    if q:
        like = f"%{q}%"
        stmt = stmt.where((User.name.ilike(like)) | (User.email.ilike(like)))
    stmt = stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)
    return db.execute(stmt).scalars().all()
