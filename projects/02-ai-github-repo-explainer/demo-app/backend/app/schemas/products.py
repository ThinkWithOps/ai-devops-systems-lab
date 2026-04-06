from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    description: str | None = None
    price: Decimal
    category: str
    image_url: str | None = None
    stock_quantity: int = 0
    sku: str


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    category: str | None = None
    image_url: str | None = None
    stock_quantity: int | None = None
    is_active: bool | None = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int
    category: str | None = None
