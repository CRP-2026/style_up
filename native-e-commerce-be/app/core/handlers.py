from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from jose import JWTError

from app.core.exceptions import AppError, error_body


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Pydantic can include non-serializable objects (e.g. ValueError) in ctx.error.
        issues = jsonable_encoder(exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_body(
                "validation_error",
                "Request validation failed",
                {"issues": issues},
            ),
        )

    @app.exception_handler(JWTError)
    async def jwt_error_handler(_: Request, __: JWTError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=error_body("invalid_token", "Invalid or expired token"),
        )
