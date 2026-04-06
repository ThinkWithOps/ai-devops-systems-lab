from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    product_name: str | None = None

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    session_id: str
    shipping_address: str
    user_id: int | None = None


class OrderResponse(BaseModel):
    id: int
    user_id: int | None = None
    session_id: str | None = None
    status: str
    total_amount: Decimal
    shipping_address: str
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    total: int


class OrderStatusUpdate(BaseModel):
    status: str
