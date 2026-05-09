from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.db.models import User as UserRow
from app.features.users import service as users_svc
from app.features.users.schemas import UserOut, UserUpdateIn

router = APIRouter()


@router.get("/me", response_model=UserOut)
def read_me(current: UserRow = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=current.id,
        name=current.name,
        email=current.email,
        phone=current.phone,
        avatar=current.avatar,
        bio=current.bio,
        is_active=current.is_active,
        role=str(current.role),
    )


@router.patch("/me", response_model=UserOut)
def patch_me(
    payload: UserUpdateIn,
    db: Session = Depends(get_db),
    current: UserRow = Depends(get_current_user),
) -> UserOut:
    row = users_svc.update_profile(db, current.store_id, current.id, payload)
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
