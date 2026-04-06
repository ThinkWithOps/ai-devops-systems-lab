from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel
from app.schemas.products import ProductResponse


class CartItemBase(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    id: int
    cart_id: int
    product_id: int
    quantity: int
    product: ProductResponse

    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    id: int
    session_id: str
    user_id: int | None = None
    items: list[CartItemResponse]
    total_items: int
    total_amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}
