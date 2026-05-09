from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

# Trỏ thẳng đến thư mục gốc chứa .env
BASE_DIR = Path(__file__).resolve().parent.parent.parent 

class Settings(BaseSettings):
    app_name: str = "native-e-commerce-be"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()