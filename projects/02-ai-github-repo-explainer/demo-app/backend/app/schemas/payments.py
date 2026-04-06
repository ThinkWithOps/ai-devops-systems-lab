from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class PaymentCreate(BaseModel):
    order_id: int
    amount: Decimal
    provider: str = "stripe_mock"


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    amount: Decimal
    status: str
    provider: str
    transaction_id: str | None = None
    error_message: str | None = None
    created_at: datetime
    processed_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentStats(BaseModel):
    total_payments: int
    successful_payments: int
    failed_payments: int
    pending_payments: int
    success_rate: float
    total_revenue: Decimal
