"""Checkout route — orchestrates order creation and payment processing."""
import structlog
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database import get_db
from app.services.order_service import order_service
from app.services.payment_service import payment_service
from app.middleware.metrics import ecommerce_orders_total, ecommerce_payment_duration_seconds
import time

logger = structlog.get_logger(__name__)
router = APIRouter()


class CheckoutRequest(BaseModel):
    shipping_address: str
    user_id: int | None = None


@router.post("/checkout")
async def checkout(
    request: CheckoutRequest,
    x_session_id: str = Header(..., description="Browser session identifier"),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete the checkout flow:
    1. Create order from cart
    2. Process payment
    3. Return order + payment result

    Supports checkout_error and payment_timeout failure injections.
    """
    logger.info("checkout_initiated", session_id=x_session_id)

    # Step 1: Create the order (may raise if checkout_error active)
    order = await order_service.create_order(
        db,
        session_id=x_session_id,
        shipping_address=request.shipping_address,
        user_id=request.user_id,
    )

    ecommerce_orders_total.labels(status="created").inc()

    # Step 2: Process payment
    payment_start = time.time()
    try:
        payment = await payment_service.process_payment(
            db,
            order_id=order.id,
            amount=order.total_amount,
        )
        payment_duration = time.time() - payment_start
        ecommerce_payment_duration_seconds.observe(payment_duration)

        if payment.status == "completed":
            ecommerce_orders_total.labels(status="paid").inc()
        else:
            ecommerce_orders_total.labels(status="payment_failed").inc()

    except Exception as e:
        ecommerce_orders_total.labels(status="payment_error").inc()
        logger.error("checkout_payment_error", order_id=order.id, error=str(e))
        raise

    # Refresh order to get updated status
    order = await order_service.get_order(db, order.id)

    return {
        "order": {
            "id": order.id,
            "status": order.status,
            "total_amount": float(order.total_amount),
            "shipping_address": order.shipping_address,
            "created_at": order.created_at.isoformat(),
        },
        "payment": {
            "id": payment.id,
            "status": payment.status,
            "amount": float(payment.amount),
            "transaction_id": payment.transaction_id,
            "error_message": payment.error_message,
        },
    }
