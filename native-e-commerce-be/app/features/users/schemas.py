from typing import Literal

from pydantic import BaseModel, EmailStr, Field

UserRole = Literal["user", "staff", "admin"]


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str | None = None
    avatar: str | None = None
    bio: str | None = None
    is_active: bool = True
    role: UserRole = "user"


class UserUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: str | None = None
    avatar: str | None = None
    bio: str | None = None


class AdminUserActiveIn(BaseModel):
    is_active: bool


class AdminUserRoleIn(BaseModel):
    role: UserRole
