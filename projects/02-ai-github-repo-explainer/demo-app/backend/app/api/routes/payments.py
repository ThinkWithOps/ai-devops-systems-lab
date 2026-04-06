"""Payment processing and status routes."""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.payment_service import payment_service

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/payments/{order_id}/process")
async def process_payment(
    order_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger payment processing for an order.
    Supports payment_timeout failure injection.
    """
    # Get order to retrieve amount
    from app.services.order_service import order_service
    order = await order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    payment = await payment_service.process_payment(
        db,
        order_id=order_id,
        amount=order.total_amount,
    )

    return {
        "id": payment.id,
        "order_id": payment.order_id,
        "amount": float(payment.amount),
        "status": payment.status,
        "provider": payment.provider,
        "transaction_id": payment.transaction_id,
        "error_message": payment.error_message,
        "created_at": payment.created_at.isoformat(),
        "processed_at": payment.processed_at.isoformat() if payment.processed_at else None,
    }


@router.get("/payments/{payment_id}")
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get payment details by payment ID."""
    payment = await payment_service.get_payment_status(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")

    return {
        "id": payment.id,
        "order_id": payment.order_id,
        "amount": float(payment.amount),
        "status": payment.status,
        "provider": payment.provider,
        "transaction_id": payment.transaction_id,
        "error_message": payment.error_message,
        "created_at": payment.created_at.isoformat(),
        "processed_at": payment.processed_at.isoformat() if payment.processed_at else None,
    }


@router.get("/payments/order/{order_id}")
async def get_payment_by_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get payment status for a specific order."""
    payment = await payment_service.get_payment_by_order(db, order_id)
    if not payment:
        raise HTTPException(status_code=404, detail=f"No payment found for order {order_id}")

    return {
        "id": payment.id,
        "order_id": payment.order_id,
        "amount": float(payment.amount),
        "status": payment.status,
        "provider": payment.provider,
        "transaction_id": payment.transaction_id,
        "error_message": payment.error_message,
        "processed_at": payment.processed_at.isoformat() if payment.processed_at else None,
    }
