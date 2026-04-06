"""
OrderService — manages order creation, retrieval, and status updates.

Orders are created from carts after stock validation. Each order captures
a point-in-time snapshot of product prices to prevent price drift issues.
"""
import structlog
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models import Order, OrderItem, Cart, CartItem
from app.services.failure_service import failure_service
from app.services.cart_service import cart_service

logger = structlog.get_logger(__name__)


class OrderService:
    """
    Handles order lifecycle from cart conversion through fulfillment.

    Failure modes:
    - checkout_error: Order creation raises a 500 Internal Server Error
    """

    async def create_order(
        self,
        db: AsyncSession,
        session_id: str,
        shipping_address: str,
        user_id: int | None = None,
    ) -> Order:
        """
        Convert a cart into a confirmed order.

        Process:
        1. Validate checkout_error failure mode
        2. Load cart and validate it has items
        3. Snapshot current prices into OrderItems
        4. Create Order record
        5. Clear cart
        """
        if failure_service.is_active("checkout_error"):
            logger.error("checkout_error failure active — rejecting order")
            raise HTTPException(
                status_code=500,
                detail="Order processing failed: internal checkout service error",
            )

        # Load cart
        cart = await cart_service.get_or_create_cart(db, session_id)
        if not cart.items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        # Calculate total from current prices (price snapshot)
        total_amount = cart_service.calculate_total(cart)

        # Create the order
        order = Order(
            user_id=user_id,
            session_id=session_id,
            status="pending",
            total_amount=total_amount,
            shipping_address=shipping_address,
        )
        db.add(order)
        await db.flush()  # Get order.id

        # Create order items with price snapshot
        for cart_item in cart.items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                quantity=cart_item.quantity,
                unit_price=cart_item.product.price,
            )
            db.add(order_item)

        await db.flush()

        # Clear the cart
        await cart_service.clear_cart(db, cart.id)

        logger.info(
            "order_created",
            order_id=order.id,
            session_id=session_id,
            total=str(total_amount),
            items=len(cart.items),
        )

        return await self.get_order(db, order.id)

    async def get_order(self, db: AsyncSession, order_id: int) -> Order | None:
        """Retrieve a single order with all items and product details."""
        result = await db.execute(
            select(Order)
            .options(
                selectinload(Order.items).selectinload(OrderItem.product),
                selectinload(Order.payment),
            )
            .where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    async def get_orders(
        self,
        db: AsyncSession,
        user_id: int | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Order]:
        """Retrieve list of orders, optionally filtered by user."""
        query = (
            select(Order)
            .options(
                selectinload(Order.items).selectinload(OrderItem.product),
                selectinload(Order.payment),
            )
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        if user_id:
            query = query.where(Order.user_id == user_id)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def update_order_status(
        self, db: AsyncSession, order_id: int, status: str
    ) -> Order | None:
        """Update order status. Valid statuses: pending, processing, shipped, delivered, cancelled."""
        valid_statuses = {"pending", "processing", "shipped", "delivered", "cancelled"}
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
            )

        order = await self.get_order(db, order_id)
        if not order:
            return None

        old_status = order.status
        order.status = status
        await db.flush()

        logger.info(
            "order_status_updated",
            order_id=order_id,
            old_status=old_status,
            new_status=status,
        )
        return order

    async def get_order_stats(self, db: AsyncSession) -> dict:
        """Return aggregate order statistics."""
        from sqlalchemy import func
        result = await db.execute(
            select(
                Order.status,
                func.count(Order.id).label("count"),
                func.sum(Order.total_amount).label("revenue"),
            ).group_by(Order.status)
        )
        rows = result.all()
        return {
            "by_status": {row.status: {"count": row.count, "revenue": float(row.revenue or 0)} for row in rows},
            "total_orders": sum(row.count for row in rows),
        }


order_service = OrderService()
