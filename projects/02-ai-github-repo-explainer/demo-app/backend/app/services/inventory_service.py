"""
InventoryService — manages product stock levels and reservation logic.

Handles stock availability checks, reservation for in-flight orders, and
stock releases for cancellations. Integrates with FailureService to simulate
inventory data discrepancies.
"""
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Product
from app.services.failure_service import failure_service

logger = structlog.get_logger(__name__)


class InventoryService:
    """
    Controls inventory checks and stock mutation operations.

    In a real system this would include distributed locking to prevent
    overselling. Here we use database-level constraints for simplicity.

    Failure modes:
    - inventory_mismatch: check_availability always returns True regardless
      of actual stock levels, simulating a cache/DB sync issue
    """

    async def check_availability(
        self,
        db: AsyncSession,
        product_id: int,
        quantity: int,
    ) -> dict:
        """
        Check if the requested quantity is available for a product.

        Returns a dict with:
        - available: bool
        - current_stock: int
        - requested: int
        - message: str
        """
        product_result = await db.execute(
            select(Product).where(Product.id == product_id, Product.is_active == True)
        )
        product = product_result.scalar_one_or_none()

        if not product:
            return {
                "available": False,
                "current_stock": 0,
                "requested": quantity,
                "message": f"Product {product_id} not found",
            }

        actual_stock = product.stock_quantity

        # inventory_mismatch failure: report availability incorrectly
        if failure_service.is_active("inventory_mismatch"):
            logger.warning(
                "inventory_mismatch failure active — reporting wrong stock level",
                product_id=product_id,
                actual_stock=actual_stock,
            )
            # Report as always available (simulates stale cache returning wrong data)
            return {
                "available": True,
                "current_stock": 999,  # Fake high stock
                "requested": quantity,
                "message": "In stock (inventory service returning cached/stale data)",
                "failure_active": True,
            }

        available = actual_stock >= quantity
        return {
            "available": available,
            "current_stock": actual_stock,
            "requested": quantity,
            "message": "In stock" if available else f"Only {actual_stock} units available",
        }

    async def reserve_stock(
        self,
        db: AsyncSession,
        product_id: int,
        quantity: int,
    ) -> bool:
        """
        Reserve (decrement) stock for a confirmed order.
        Returns True if successful, False if insufficient stock.
        """
        product_result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = product_result.scalar_one_or_none()

        if not product or product.stock_quantity < quantity:
            logger.warning(
                "stock_reservation_failed",
                product_id=product_id,
                requested=quantity,
                available=product.stock_quantity if product else 0,
            )
            return False

        product.stock_quantity -= quantity
        await db.flush()

        logger.info(
            "stock_reserved",
            product_id=product_id,
            quantity=quantity,
            remaining=product.stock_quantity,
        )
        return True

    async def release_stock(
        self,
        db: AsyncSession,
        product_id: int,
        quantity: int,
    ) -> bool:
        """
        Release (increment) reserved stock back to available pool.
        Called when an order is cancelled.
        """
        product_result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = product_result.scalar_one_or_none()

        if not product:
            return False

        product.stock_quantity += quantity
        await db.flush()

        logger.info(
            "stock_released",
            product_id=product_id,
            quantity=quantity,
            new_total=product.stock_quantity,
        )
        return True

    async def get_inventory_levels(self, db: AsyncSession) -> list[dict]:
        """Return all product inventory levels for the operator dashboard."""
        result = await db.execute(
            select(Product.id, Product.name, Product.sku, Product.stock_quantity, Product.category)
            .where(Product.is_active == True)
            .order_by(Product.stock_quantity.asc())
        )
        rows = result.all()
        return [
            {
                "product_id": row.id,
                "name": row.name,
                "sku": row.sku,
                "category": row.category,
                "stock_quantity": row.stock_quantity,
                "status": "critical" if row.stock_quantity < 5 else "low" if row.stock_quantity < 20 else "ok",
            }
            for row in rows
        ]


inventory_service = InventoryService()
