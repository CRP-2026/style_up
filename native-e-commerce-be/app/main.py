from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.api.router import api_router
from app.core.handlers import register_exception_handlers

# Load models so relationships/metadata are registered when using tooling (optional)
from app.db import models as _models  # noqa: F401

app = FastAPI(title="Jewelry Shop API", version="1.0.0")

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

MEDIA_DIR = Path(__file__).resolve().parents[1] / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")


@app.get("/", tags=["system"])
def read_root():
    return {"message": "Native E‑Commerce API", "docs": "/docs"}
