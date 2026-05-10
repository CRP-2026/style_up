from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests

from app.core.database import get_db
from app.core.deps import get_store_id, get_token_payload
from app.features.auth import service as auth_svc
from app.features.auth.schemas import LoginRequest, SignupRequest, Token

from app.features.auth.schemas import GoogleLoginRequest

router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
) -> Token:
    user = auth_svc.login_user(db, store_id, payload.email, payload.password)
    token = auth_svc.issue_token(user.id, store_id)
    return Token(access_token=token)

@router.post("/google-login")
async def google_login(
    payload: GoogleLoginRequest,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
) -> Token:

    user = auth_svc.google_login_user(
        db=db,
        store_id=store_id,
        id_token_str=payload.id_token,
    )

    token = auth_svc.issue_token(user.id, store_id)

    return Token(access_token=token)


@router.post("/register", response_model=Token)
def register(
    payload: SignupRequest,
    db: Session = Depends(get_db),
    store_id: Annotated[int, Depends(get_store_id)] = 1,
) -> Token:
    user = auth_svc.register_user(db, store_id, payload.email, payload.password, payload.name)
    token = auth_svc.issue_token(user.id, store_id)
    return Token(access_token=token)


@router.post("/logout")
def logout(
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
) -> dict[str, bool]:
    auth_svc.revoke_access_token_from_payload(db, payload)
    return {"logged_out": True}
