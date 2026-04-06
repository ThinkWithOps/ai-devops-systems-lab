"""Order management routes."""
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.order_service import order_service

logger = structlog.get_logger(__name__)
router = APIRouter()


def serialize_order(order) -> dict:
    """Serialize an order with all nested relationships."""
    items = []
    for item in order.items:
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "product_name": item.product.name if item.product else None,
        })

    payment = None
    if order.payment:
        payment = {
            "id": order.payment.id,
            "status": order.payment.status,
            "amount": float(order.payment.amount),
            "transaction_id": order.payment.transaction_id,
            "processed_at": order.payment.processed_at.isoformat() if order.payment.processed_at else None,
        }

    return {
        "id": order.id,
        "user_id": order.user_id,
        "session_id": order.session_id,
        "status": order.status,
        "total_amount": float(order.total_amount),
        "shipping_address": order.shipping_address,
        "items": items,
        "payment": payment,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
    }


@router.get("/orders")
async def list_orders(
    user_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List orders, optionally filtered by user ID."""
    orders = await order_service.get_orders(db, user_id=user_id, skip=skip, limit=limit)
    return {
        "orders": [serialize_order(o) for o in orders],
        "total": len(orders),
    }


@router.get("/orders/{order_id}")
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single order by ID with full details."""
    order = await order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return serialize_order(order)


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update order status (admin operation)."""
    status = body.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="status field required")

    order = await order_service.update_order_status(db, order_id, status)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return serialize_order(order)
