"""
CartService — manages shopping cart operations backed by both PostgreSQL and Redis.

Cart data is stored in PostgreSQL for persistence and Redis for fast session-based
lookups. Session IDs are used to associate carts with anonymous users.
"""
import json
import structlog
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models import Cart, CartItem, Product
from app.config import settings
import redis as redis_sync

logger = structlog.get_logger(__name__)


def get_redis_client():
    """Create a synchronous Redis client for cart operations."""
    return redis_sync.from_url(settings.redis_url, decode_responses=True)


CART_SESSION_TTL = 86400 * 7  # 7 days


class CartService:
    """
    Manages cart lifecycle using PostgreSQL for durable storage and Redis
    for fast session-to-cart-id mapping.

    Session IDs (from browser localStorage/cookies) are used as cart keys.
    """

    async def get_or_create_cart(self, db: AsyncSession, session_id: str) -> Cart:
        """
        Retrieve existing cart for a session or create a new one.
        Uses Redis to cache the session_id → cart_id mapping.
        """
        # Check Redis cache first
        redis_client = get_redis_client()
        redis_key = f"cart:session:{session_id}"
        cached_cart_id = redis_client.get(redis_key)

        if cached_cart_id:
            result = await db.execute(
                select(Cart)
                .options(selectinload(Cart.items).selectinload(CartItem.product))
                .where(Cart.id == int(cached_cart_id))
            )
            cart = result.scalar_one_or_none()
            if cart:
                return cart

        # Look up in database
        result = await db.execute(
            select(Cart)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
            .where(Cart.session_id == session_id)
        )
        cart = result.scalar_one_or_none()

        if not cart:
            cart = Cart(session_id=session_id)
            db.add(cart)
            await db.flush()
            logger.info("cart_created", session_id=session_id, cart_id=cart.id)

        # Cache mapping in Redis
        redis_client.setex(redis_key, CART_SESSION_TTL, str(cart.id))
        return cart

    async def get_cart(self, db: AsyncSession, cart_id: int) -> Cart | None:
        """Retrieve cart with all items and product details loaded."""
        result = await db.execute(
            select(Cart)
            .options(selectinload(Cart.items).selectinload(CartItem.product))
            .where(Cart.id == cart_id)
        )
        return result.scalar_one_or_none()

    async def add_item(
        self,
        db: AsyncSession,
        cart_id: int,
        product_id: int,
        quantity: int = 1,
    ) -> Cart | None:
        """
        Add a product to the cart. If item already exists, increment quantity.
        Returns updated cart or None if cart/product not found.
        """
        cart = await self.get_cart(db, cart_id)
        if not cart:
            return None

        # Verify product exists and is in stock
        product_result = await db.execute(
            select(Product).where(Product.id == product_id, Product.is_active == True)
        )
        product = product_result.scalar_one_or_none()
        if not product:
            return None

        # Check if item already in cart
        existing_item = next(
            (item for item in cart.items if item.product_id == product_id), None
        )

        if existing_item:
            existing_item.quantity += quantity
            logger.info("cart_item_updated", cart_id=cart_id, product_id=product_id, quantity=existing_item.quantity)
        else:
            new_item = CartItem(cart_id=cart_id, product_id=product_id, quantity=quantity)
            db.add(new_item)
            logger.info("cart_item_added", cart_id=cart_id, product_id=product_id, quantity=quantity)

        await db.flush()
        return await self.get_cart(db, cart_id)

    async def update_item(
        self,
        db: AsyncSession,
        cart_id: int,
        item_id: int,
        quantity: int,
    ) -> Cart | None:
        """Update the quantity of a specific cart item."""
        result = await db.execute(
            select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart_id)
        )
        item = result.scalar_one_or_none()

        if not item:
            return None

        if quantity <= 0:
            await db.delete(item)
        else:
            item.quantity = quantity

        await db.flush()
        return await self.get_cart(db, cart_id)

    async def remove_item(
        self, db: AsyncSession, cart_id: int, item_id: int
    ) -> Cart | None:
        """Remove a specific item from the cart."""
        result = await db.execute(
            select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart_id)
        )
        item = result.scalar_one_or_none()

        if item:
            await db.delete(item)
            await db.flush()
            logger.info("cart_item_removed", cart_id=cart_id, item_id=item_id)

        return await self.get_cart(db, cart_id)

    async def clear_cart(self, db: AsyncSession, cart_id: int) -> None:
        """Remove all items from a cart (e.g., after successful order placement)."""
        result = await db.execute(
            select(CartItem).where(CartItem.cart_id == cart_id)
        )
        items = result.scalars().all()
        for item in items:
            await db.delete(item)
        await db.flush()
        logger.info("cart_cleared", cart_id=cart_id, items_removed=len(items))

    def calculate_total(self, cart: Cart) -> Decimal:
        """Calculate total cart value from line items."""
        return sum(
            item.product.price * item.quantity
            for item in cart.items
            if item.product
        )


cart_service = CartService()
