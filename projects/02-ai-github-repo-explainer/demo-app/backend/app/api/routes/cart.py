"""Shopping cart API routes — session-based, no authentication required."""
import structlog
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.cart_service import cart_service
from app.schemas.cart import CartResponse, CartItemCreate, CartItemUpdate
from decimal import Decimal

logger = structlog.get_logger(__name__)
router = APIRouter()


def build_cart_response(cart) -> dict:
    """Build cart response with computed totals."""
    total_amount = cart_service.calculate_total(cart)
    total_items = sum(item.quantity for item in cart.items)

    items = []
    for item in cart.items:
        items.append({
            "id": item.id,
            "cart_id": item.cart_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "product": {
                "id": item.product.id,
                "name": item.product.name,
                "description": item.product.description,
                "price": float(item.product.price),
                "category": item.product.category,
                "image_url": item.product.image_url,
                "stock_quantity": item.product.stock_quantity,
                "sku": item.product.sku,
                "is_active": item.product.is_active,
                "created_at": item.product.created_at.isoformat(),
            },
        })

    return {
        "id": cart.id,
        "session_id": cart.session_id,
        "user_id": cart.user_id,
        "items": items,
        "total_items": total_items,
        "total_amount": float(total_amount),
        "created_at": cart.created_at.isoformat(),
    }


@router.get("/cart")
async def get_cart(
    x_session_id: str = Header(..., description="Browser session identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the current cart for a session."""
    cart = await cart_service.get_or_create_cart(db, session_id=x_session_id)
    return build_cart_response(cart)


@router.post("/cart/items")
async def add_to_cart(
    item: CartItemCreate,
    x_session_id: str = Header(..., description="Browser session identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Add a product to the cart."""
    cart = await cart_service.get_or_create_cart(db, session_id=x_session_id)
    updated_cart = await cart_service.add_item(
        db,
        cart_id=cart.id,
        product_id=item.product_id,
        quantity=item.quantity,
    )
    if not updated_cart:
        raise HTTPException(status_code=404, detail="Product not found or unavailable")
    return build_cart_response(updated_cart)


@router.put("/cart/items/{item_id}")
async def update_cart_item(
    item_id: int,
    update: CartItemUpdate,
    x_session_id: str = Header(..., description="Browser session identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Update quantity of a cart item."""
    cart = await cart_service.get_or_create_cart(db, session_id=x_session_id)
    updated_cart = await cart_service.update_item(
        db,
        cart_id=cart.id,
        item_id=item_id,
        quantity=update.quantity,
    )
    if not updated_cart:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return build_cart_response(updated_cart)


@router.delete("/cart/items/{item_id}")
async def remove_from_cart(
    item_id: int,
    x_session_id: str = Header(..., description="Browser session identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Remove a specific item from the cart."""
    cart = await cart_service.get_or_create_cart(db, session_id=x_session_id)
    updated_cart = await cart_service.remove_item(db, cart_id=cart.id, item_id=item_id)
    return build_cart_response(updated_cart)


@router.delete("/cart")
async def clear_cart(
    x_session_id: str = Header(..., description="Browser session identifier"),
    db: AsyncSession = Depends(get_db),
):
    """Clear all items from the cart."""
    cart = await cart_service.get_or_create_cart(db, session_id=x_session_id)
    await cart_service.clear_cart(db, cart_id=cart.id)
    return {"message": "Cart cleared", "cart_id": cart.id}
