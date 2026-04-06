import asyncio
import structlog
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db, Order, MenuItem, Payment, Table
from app.services.failure_service import failure_service
from app.services.metrics_service import metrics

router = APIRouter()
logger = structlog.get_logger()


class OrderItem(BaseModel):
    menu_item_id: int
    quantity: int


class OrderCreate(BaseModel):
    table_id: int
    customer_name: str
    items: List[OrderItem]
    payment_method: str = "card"


class StatusUpdate(BaseModel):
    status: str


@router.post("/orders", status_code=201)
async def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    """
    Place a new order. Calculates total from menu prices.
    Creates both Order and Payment records.
    Subject to `db_slow` failure which adds 1s delay.
    """
    logger.info(
        "order_create_attempt",
        table_id=data.table_id,
        customer=data.customer_name,
        item_count=len(data.items),
        failure_active=failure_service.is_active("db_slow"),
    )

    # Failure injection: db_slow adds 1s delay before DB operations
    if failure_service.is_active("db_slow"):
        logger.warning("db_slow_failure_active", delay_seconds=1, failure_type="db_slow")
        await asyncio.sleep(1)

    # Verify table
    table = db.query(Table).filter(Table.id == data.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail=f"Table {data.table_id} not found")

    # Resolve menu items and calculate total
    order_items = []
    total_amount = 0.0

    for item_req in data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_req.menu_item_id).first()
        if not menu_item:
            raise HTTPException(
                status_code=404,
                detail=f"Menu item {item_req.menu_item_id} not found",
            )
        if not menu_item.is_available:
            raise HTTPException(
                status_code=400,
                detail=f"Menu item '{menu_item.name}' is currently unavailable",
            )

        line_total = menu_item.price * item_req.quantity
        total_amount += line_total

        order_items.append({
            "menu_item_id": menu_item.id,
            "name": menu_item.name,
            "quantity": item_req.quantity,
            "unit_price": menu_item.price,
            "line_total": round(line_total, 2),
        })

    # Create order
    order = Order(
        table_id=data.table_id,
        customer_name=data.customer_name,
        status="pending",
        total_amount=round(total_amount, 2),
        items=order_items,
    )
    db.add(order)
    db.flush()

    # Create payment record
    payment = Payment(
        order_id=order.id,
        amount=round(total_amount, 2),
        status="pending",
        method=data.payment_method,
    )
    db.add(payment)
    db.commit()
    db.refresh(order)
    db.refresh(payment)

    metrics.orders_total.labels(status="pending").inc()

    logger.info(
        "order_created",
        order_id=order.id,
        table_id=data.table_id,
        customer=data.customer_name,
        total_amount=total_amount,
        item_count=len(order_items),
        payment_id=payment.id,
    )

    return {
        "id": order.id,
        "table_id": order.table_id,
        "table_number": table.number,
        "customer_name": order.customer_name,
        "status": order.status,
        "total_amount": order.total_amount,
        "items": order.items,
        "payment_id": payment.id,
        "payment_status": payment.status,
        "created_at": order.created_at.isoformat(),
    }


@router.get("/orders")
async def list_orders(
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
):
    """List orders, optionally filtered by status."""
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)

    orders = query.order_by(Order.created_at.desc()).all()

    result = []
    for o in orders:
        table = db.query(Table).filter(Table.id == o.table_id).first()
        result.append({
            "id": o.id,
            "table_id": o.table_id,
            "table_number": table.number if table else None,
            "customer_name": o.customer_name,
            "status": o.status,
            "total_amount": o.total_amount,
            "item_count": len(o.items) if o.items else 0,
            "created_at": o.created_at.isoformat(),
        })

    logger.info("orders_listed", count=len(result), status_filter=status)
    return {"orders": result, "total": len(result)}


@router.get("/orders/{order_id}")
async def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get full order details including all items."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    table = db.query(Table).filter(Table.id == order.table_id).first()
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()

    logger.info("order_fetched", order_id=order_id, status=order.status)

    return {
        "id": order.id,
        "table_id": order.table_id,
        "table_number": table.number if table else None,
        "customer_name": order.customer_name,
        "status": order.status,
        "total_amount": order.total_amount,
        "items": order.items,
        "payment": {
            "id": payment.id,
            "status": payment.status,
            "method": payment.method,
            "amount": payment.amount,
        } if payment else None,
        "created_at": order.created_at.isoformat(),
    }


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
):
    """Update the status of an order."""
    valid_statuses = ["pending", "preparing", "ready", "served", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{data.status}'. Must be one of: {valid_statuses}",
        )

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    old_status = order.status
    order.status = data.status
    db.commit()

    metrics.orders_total.labels(status=data.status).inc()

    logger.info(
        "order_status_updated",
        order_id=order_id,
        old_status=old_status,
        new_status=data.status,
    )

    return {
        "id": order.id,
        "status": order.status,
        "previous_status": old_status,
        "message": f"Order {order_id} updated from {old_status} to {data.status}",
    }
