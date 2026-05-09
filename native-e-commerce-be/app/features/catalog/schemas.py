from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    id: str
    label: str
    image: str | None = ""

class ProductListParams(BaseModel):
    category_id: str | None = None
    min_price: float | None = Field(default=None, alias="min_price")
    max_price: float | None = Field(default=None, alias="max_price")
    search: str | None = None
    limit: int = Field(default=24, ge=1, le=500)
    offset: int = Field(default=0, ge=0)

    model_config = {"populate_by_name": True}
