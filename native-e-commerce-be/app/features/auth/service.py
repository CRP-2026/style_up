from __future__ import annotations

from concurrent.futures import process
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import RevokedAccessToken, User

from google.oauth2 import id_token
from google.auth.transport import requests

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import User

import uuid
import os


def register_user(db: Session, store_id: int, email: str, password: str, name: str) -> User:
    exists = db.execute(
        select(User).where(User.store_id == store_id, User.email == email, User.deleted_at.is_(None))
    ).scalar_one_or_none()
    if exists:
        raise AppError("conflict", "Email already registered for this store", status_code=409)
    uid = str(uuid.uuid4())
    u = User(
        id=uid,
        store_id=store_id,
        email=email,
        password_hash=hash_password(password),
        name=name,
        is_active=True,
        role="user",
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def login_user(db: Session, store_id: int, email: str, password: str) -> User:
    u = db.execute(
        select(User).where(
            User.store_id == store_id,
            User.email == email,
            User.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if u is None or not u.password_hash or not verify_password(password, u.password_hash):
        raise AppError("unauthorized", "Invalid email or password", status_code=401)
    if not u.is_active:
        raise AppError(
            "account_inactive",
            "Tài khoản đã bị dừng hoạt động.",
            status_code=403,
        )
    return u

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


def google_login_user(
    db: Session,
    store_id: int,
    id_token_str: str,
):
    try:
        idinfo = id_token.verify_oauth2_token(
            id_token_str,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google token"
        )

    email = idinfo.get("email")
    if not idinfo.get("email_verified"):
        raise HTTPException(
            status_code=401,
            detail="Google email not verified"
        )
    name = idinfo.get("name")
    avatar = idinfo.get("picture")

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Google account has no email"
        )

    user = (
        db.query(User)
        .filter(
            User.store_id == store_id,
            User.email == email
        )
        .first()
    )

    if not user:
        user = User(
            id=str(uuid.uuid4()),
            store_id=store_id,
            email=email,
            name=name or "Google User",
            avatar=avatar,
            password_hash=None,
            is_active=True,
            role="user",
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    return user

def issue_token(user_id: str, store_id: int) -> str:
    jti = str(uuid.uuid4())
    return create_access_token(
        {"sub": user_id, "sid": store_id, "jti": jti},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def ensure_access_token_not_revoked(db: Session, payload: dict) -> None:
    jti = payload.get("jti")
    if not jti:
        raise AppError(
            "invalid_token",
            "Token is missing jti; please sign in again",
            status_code=401,
        )
    revoked = db.execute(select(RevokedAccessToken).where(RevokedAccessToken.jti == str(jti))).scalar_one_or_none()
    if revoked is not None:
        raise AppError("invalid_token", "Token has been revoked", status_code=401)


def revoke_access_token_from_payload(db: Session, payload: dict) -> None:
    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti or exp is None:
        return
    if isinstance(exp, datetime):
        expires_at = exp if exp.tzinfo else exp.replace(tzinfo=timezone.utc)
    else:
        expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
    stmt = pg_insert(RevokedAccessToken).values(jti=str(jti), expires_at=expires_at).on_conflict_do_nothing(
        index_elements=["jti"]
    )
    db.execute(stmt)
    db.commit()
