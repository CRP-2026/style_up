from fastapi import APIRouter

from app.features.addresses.router import router as addresses_router
from app.features.admin.router import router as admin_router
from app.features.auth.router import router as auth_router
from app.features.catalog.router import router as catalog_router
from app.features.orders.router import router as orders_router
from app.features.users.router import router as users_router

api_router = APIRouter()


@api_router.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "API ready"}


api_router.include_router(catalog_router, tags=["catalog"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(addresses_router, prefix="/addresses", tags=["addresses"])
api_router.include_router(orders_router, prefix="/orders", tags=["orders"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
