"""
ProductService — handles all product catalog operations.

Provides product retrieval, search, and stock management.
Integrates with FailureService to simulate slow catalog responses.
"""
import asyncio
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models import Product
from app.services.failure_service import failure_service

logger = structlog.get_logger(__name__)


class ProductService:
    """
    Manages product catalog queries and stock updates.

    Failure modes:
    - slow_products: Injects a 2-second delay into all product queries
    """

    async def get_products(
        self,
        db: AsyncSession,
        category: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Product]:
        """
        Retrieve products, optionally filtered by category.
        Applies slow_products failure mode when active.
        """
        if failure_service.is_active("slow_products"):
            logger.warning("slow_products failure active — injecting 2s delay")
            await asyncio.sleep(2.0)

        query = select(Product).where(Product.is_active == True)

        if category:
            query = query.where(Product.category == category)

        query = query.offset(skip).limit(limit).order_by(Product.id)
        result = await db.execute(query)
        products = result.scalars().all()

        logger.info("products_fetched", count=len(products), category=category)
        return list(products)

    async def get_product(self, db: AsyncSession, product_id: int) -> Product | None:
        """Retrieve a single product by ID."""
        if failure_service.is_active("slow_products"):
            await asyncio.sleep(2.0)

        result = await db.execute(
            select(Product).where(Product.id == product_id, Product.is_active == True)
        )
        return result.scalar_one_or_none()

    async def search_products(
        self, db: AsyncSession, query: str, limit: int = 20
    ) -> list[Product]:
        """Full-text search across product name and description."""
        if failure_service.is_active("slow_products"):
            await asyncio.sleep(2.0)

        search_term = f"%{query}%"
        result = await db.execute(
            select(Product)
            .where(
                Product.is_active == True,
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.category.ilike(search_term),
                ),
            )
            .limit(limit)
        )
        products = result.scalars().all()
        logger.info("products_searched", query=query, results=len(products))
        return list(products)

    async def get_categories(self, db: AsyncSession) -> list[str]:
        """Return list of distinct product categories."""
        from sqlalchemy import distinct
        result = await db.execute(
            select(distinct(Product.category)).where(Product.is_active == True)
        )
        return list(result.scalars().all())

    async def update_stock(
        self, db: AsyncSession, product_id: int, quantity_delta: int
    ) -> Product | None:
        """
        Update product stock by a delta amount (positive = add, negative = subtract).
        Returns updated product or None if not found.
        """
        product = await self.get_product(db, product_id)
        if not product:
            return None

        product.stock_quantity = max(0, product.stock_quantity + quantity_delta)
        await db.flush()
        logger.info("stock_updated", product_id=product_id, new_stock=product.stock_quantity)
        return product

    async def get_product_count(self, db: AsyncSession, category: str | None = None) -> int:
        """Return total product count, optionally filtered by category."""
        from sqlalchemy import func
        query = select(func.count(Product.id)).where(Product.is_active == True)
        if category:
            query = query.where(Product.category == category)
        result = await db.execute(query)
        return result.scalar_one()


product_service = ProductService()
