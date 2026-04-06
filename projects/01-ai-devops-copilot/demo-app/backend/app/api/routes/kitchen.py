import structlog
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db.database import get_db, Order, Table
from app.services.failure_service import failure_service
from app.services.metrics_service import metrics

router = APIRouter()
logger = structlog.get_logger()

STATUS_PROGRESSION = {
    "pending": "preparing",
    "preparing": "ready",
    "ready": "served",
}


@router.get("/kitchen/queue")
async def get_kitchen_queue(db: Session = Depends(get_db)):
    """
    Returns all orders in the kitchen queue (pending or preparing).
    Subject to `kitchen_down` failure which returns 503.
    """
    # Failure injection: kitchen_down returns 503
    if failure_service.is_active("kitchen_down"):
        logger.error(
            "kitchen_down_failure_active",
            failure_type="kitchen_down",
            detail="Kitchen management system unavailable",
        )
        raise HTTPException(
            status_code=503,
            detail="Kitchen system is currently unavailable. Please contact technical support.",
        )

    orders = (
        db.query(Order)
        .filter(Order.status.in_(["pending", "preparing"]))
        .order_by(Order.created_at.asc())
        .all()
    )

    queue = []
    for o in orders:
        table = db.query(Table).filter(Table.id == o.table_id).first()
        queue.append({
            "id": o.id,
            "table_id": o.table_id,
            "table_number": table.number if table else None,
            "customer_name": o.customer_name,
            "status": o.status,
            "total_amount": o.total_amount,
            "item_count": len(o.items) if o.items else 0,
            "items": o.items,
            "created_at": o.created_at.isoformat(),
            "next_status": STATUS_PROGRESSION.get(o.status),
        })

    # Update kitchen queue depth gauge
    metrics.kitchen_queue_depth.set(len(queue))

    logger.info(
        "kitchen_queue_fetched",
        queue_depth=len(queue),
        pending=sum(1 for o in queue if o["status"] == "pending"),
        preparing=sum(1 for o in queue if o["status"] == "preparing"),
    )

    return {
        "queue": queue,
        "total": len(queue),
        "pending_count": sum(1 for o in queue if o["status"] == "pending"),
        "preparing_count": sum(1 for o in queue if o["status"] == "preparing"),
    }


@router.put("/kitchen/orders/{order_id}/advance")
async def advance_kitchen_order(order_id: int, db: Session = Depends(get_db)):
    """
    Advance an order to its next status in the kitchen workflow.
    pending → preparing → ready → served
    """
    # Failure injection check
    if failure_service.is_active("kitchen_down"):
        logger.error("kitchen_down_failure_active_on_advance", order_id=order_id)
        raise HTTPException(status_code=503, detail="Kitchen system is currently unavailable")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    if order.status not in STATUS_PROGRESSION:
        raise HTTPException(
            status_code=400,
            detail=f"Order {order_id} has status '{order.status}' which cannot be advanced further",
        )

    old_status = order.status
    new_status = STATUS_PROGRESSION[old_status]
    order.status = new_status
    db.commit()

    # Update queue depth after status change
    remaining = (
        db.query(Order)
        .filter(Order.status.in_(["pending", "preparing"]))
        .count()
    )
    metrics.kitchen_queue_depth.set(remaining)
    metrics.orders_total.labels(status=new_status).inc()

    logger.info(
        "kitchen_order_advanced",
        order_id=order_id,
        old_status=old_status,
        new_status=new_status,
        kitchen_queue_depth=remaining,
    )

    return {
        "id": order.id,
        "previous_status": old_status,
        "status": new_status,
        "message": f"Order {order_id} advanced: {old_status} → {new_status}",
    }
