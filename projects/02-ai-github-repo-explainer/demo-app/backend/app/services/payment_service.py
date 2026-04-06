"""
PaymentService — simulates payment processing with a mock provider.

In production this would integrate with Stripe, PayPal, or another
payment gateway. Here we simulate the full payment lifecycle including
timeouts, failures, and success scenarios for demo purposes.
"""
import asyncio
import uuid
import structlog
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException
from app.models import Payment, Order
from app.services.failure_service import failure_service

logger = structlog.get_logger(__name__)


class PaymentService:
    """
    Simulates payment processing with configurable failure injection.

    The mock provider always approves payments (unless failure modes are active),
    making it safe for demo and testing without real financial transactions.

    Failure modes:
    - payment_timeout: Sleeps for 5 seconds then raises a timeout error
    """

    async def process_payment(
        self,
        db: AsyncSession,
        order_id: int,
        amount: Decimal,
        provider: str = "stripe_mock",
    ) -> Payment:
        """
        Process payment for an order.

        Flow:
        1. Check for existing payment (idempotency)
        2. Apply payment_timeout failure if active
        3. Simulate payment provider call
        4. Create Payment record with result
        5. Update Order status
        """
        # Check for existing payment (prevent double-charging)
        existing = await db.execute(
            select(Payment).where(Payment.order_id == order_id)
        )
        existing_payment = existing.scalar_one_or_none()
        if existing_payment and existing_payment.status == "completed":
            return existing_payment

        # Validate order exists
        order_result = await db.execute(select(Order).where(Order.id == order_id))
        order = order_result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

        # Create pending payment record
        payment = existing_payment or Payment(
            order_id=order_id,
            amount=amount,
            status="pending",
            provider=provider,
        )

        if not existing_payment:
            db.add(payment)
            await db.flush()

        logger.info("payment_initiated", order_id=order_id, amount=str(amount))

        # Simulate payment_timeout failure
        if failure_service.is_active("payment_timeout"):
            logger.warning("payment_timeout failure active — sleeping 5s then failing")
            await asyncio.sleep(5.0)
            payment.status = "failed"
            payment.error_message = "Payment processor timeout: gateway did not respond within 5 seconds"
            payment.processed_at = datetime.utcnow()
            order.status = "payment_failed"
            await db.flush()
            logger.error("payment_failed_timeout", order_id=order_id)
            return payment

        # Simulate payment processing delay (normal case)
        await asyncio.sleep(0.5)

        # Mock payment provider approval
        transaction_id = f"txn_{uuid.uuid4().hex[:16]}"
        payment.status = "completed"
        payment.transaction_id = transaction_id
        payment.processed_at = datetime.utcnow()

        # Update order status to processing
        order.status = "processing"
        await db.flush()

        logger.info(
            "payment_completed",
            order_id=order_id,
            transaction_id=transaction_id,
            amount=str(amount),
        )
        return payment

    async def get_payment_status(
        self, db: AsyncSession, payment_id: int
    ) -> Payment | None:
        """Retrieve payment details by ID."""
        result = await db.execute(select(Payment).where(Payment.id == payment_id))
        return result.scalar_one_or_none()

    async def get_payment_by_order(
        self, db: AsyncSession, order_id: int
    ) -> Payment | None:
        """Retrieve payment associated with a specific order."""
        result = await db.execute(
            select(Payment).where(Payment.order_id == order_id)
        )
        return result.scalar_one_or_none()

    async def get_payment_stats(self, db: AsyncSession) -> dict:
        """Return aggregate payment statistics for the operator dashboard."""
        result = await db.execute(
            select(
                Payment.status,
                func.count(Payment.id).label("count"),
                func.sum(Payment.amount).label("total"),
            ).group_by(Payment.status)
        )
        rows = result.all()

        stats = {row.status: {"count": row.count, "total": float(row.total or 0)} for row in rows}
        total_payments = sum(row.count for row in rows)
        successful = stats.get("completed", {}).get("count", 0)
        success_rate = (successful / total_payments * 100) if total_payments > 0 else 0.0
        total_revenue = stats.get("completed", {}).get("total", 0.0)

        return {
            "total_payments": total_payments,
            "successful_payments": successful,
            "failed_payments": stats.get("failed", {}).get("count", 0),
            "pending_payments": stats.get("pending", {}).get("count", 0),
            "success_rate": round(success_rate, 1),
            "total_revenue": total_revenue,
        }


payment_service = PaymentService()
