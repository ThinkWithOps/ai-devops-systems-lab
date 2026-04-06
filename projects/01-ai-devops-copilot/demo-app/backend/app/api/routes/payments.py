import asyncio
import time
import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db, Payment, Order
from app.services.failure_service import failure_service
from app.services.metrics_service import metrics

router = APIRouter()
logger = structlog.get_logger()


@router.post("/payments/{order_id}/process")
async def process_payment(order_id: int, db: Session = Depends(get_db)):
    """
    Process payment for an order.
    Subject to `payment_timeout` failure which waits 5s then fails.
    Records payment_duration histogram metric.
    """
    start_time = time.time()

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(
            status_code=404,
            detail=f"No payment record found for order {order_id}",
        )

    if payment.status == "success":
        return {
            "id": payment.id,
            "order_id": order_id,
            "amount": payment.amount,
            "status": payment.status,
            "method": payment.method,
            "message": "Payment was already processed successfully",
        }

    logger.info(
        "payment_processing_start",
        order_id=order_id,
        payment_id=payment.id,
        amount=payment.amount,
        method=payment.method,
        failure_active=failure_service.is_active("payment_timeout"),
    )

    # Failure injection: payment_timeout — wait 5s then fail
    if failure_service.is_active("payment_timeout"):
        logger.warning(
            "payment_timeout_failure_active",
            failure_type="payment_timeout",
            order_id=order_id,
            timeout_seconds=5,
        )
        await asyncio.sleep(5)

        payment.status = "failed"
        db.commit()

        duration = time.time() - start_time
        metrics.payment_duration.observe(duration)

        logger.error(
            "payment_failed_timeout",
            order_id=order_id,
            payment_id=payment.id,
            duration_seconds=round(duration, 3),
            failure_type="payment_timeout",
        )

        return {
            "id": payment.id,
            "order_id": order_id,
            "amount": payment.amount,
            "status": "failed",
            "method": payment.method,
            "error": "Payment gateway timeout after 5 seconds",
            "duration_seconds": round(duration, 3),
        }

    # Normal payment processing (simulated ~200ms)
    await asyncio.sleep(0.2)

    payment.status = "success"
    db.commit()

    duration = time.time() - start_time
    metrics.payment_duration.observe(duration)

    logger.info(
        "payment_processed_success",
        order_id=order_id,
        payment_id=payment.id,
        amount=payment.amount,
        method=payment.method,
        duration_seconds=round(duration, 3),
    )

    return {
        "id": payment.id,
        "order_id": order_id,
        "amount": payment.amount,
        "status": "success",
        "method": payment.method,
        "duration_seconds": round(duration, 3),
    }


@router.get("/payments")
async def list_payments(db: Session = Depends(get_db)):
    """List all payment records. Used by the operator dashboard."""
    payments = db.query(Payment).order_by(Payment.created_at.desc()).all()

    result = []
    for p in payments:
        order = db.query(Order).filter(Order.id == p.order_id).first()
        result.append({
            "id": p.id,
            "order_id": p.order_id,
            "customer_name": order.customer_name if order else "Unknown",
            "amount": p.amount,
            "status": p.status,
            "method": p.method,
            "created_at": p.created_at.isoformat(),
        })

    logger.info("payments_listed", count=len(result))
    return {"payments": result, "total": len(result)}
