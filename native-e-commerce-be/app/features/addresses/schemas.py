from pydantic import BaseModel, ConfigDict, Field


class AddressIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    address: str = Field(min_length=1)
    city: str = Field(min_length=1)
    is_default: bool = Field(default=False, alias="isDefault")


class AddressOut(BaseModel):
    id: str
    name: str
    phone: str
    address: str
    city: str
    isDefault: bool
