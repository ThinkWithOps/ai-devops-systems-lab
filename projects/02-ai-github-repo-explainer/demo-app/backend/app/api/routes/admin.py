"""Admin dashboard routes — failure injection, stats, seed data."""
import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.failure_service import failure_service
from app.services.payment_service import payment_service
from app.services.order_service import order_service
from app.services.inventory_service import inventory_service
from app.middleware.metrics import ecommerce_active_failures

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/admin/failures")
async def get_failures():
    """Return current state of all failure modes."""
    failures = failure_service.get_failures()
    return {
        "failures": failures,
        "active_count": failure_service.get_active_count(),
        "active_modes": failure_service.get_active_modes(),
    }


@router.post("/admin/failures/{mode}/enable")
async def enable_failure(mode: str):
    """Enable a specific failure mode."""
    success = failure_service.enable(mode)
    if not success:
        raise HTTPException(status_code=404, detail=f"Unknown failure mode: {mode}")
    ecommerce_active_failures.labels(mode=mode).set(1)
    logger.warning("failure_mode_enabled", mode=mode)
    return {"mode": mode, "active": True, "message": f"Failure mode '{mode}' enabled"}


@router.post("/admin/failures/{mode}/disable")
async def disable_failure(mode: str):
    """Disable a specific failure mode."""
    success = failure_service.disable(mode)
    if not success:
        raise HTTPException(status_code=404, detail=f"Unknown failure mode: {mode}")
    ecommerce_active_failures.labels(mode=mode).set(0)
    logger.info("failure_mode_disabled", mode=mode)
    return {"mode": mode, "active": False, "message": f"Failure mode '{mode}' disabled"}


@router.post("/admin/failures/disable-all")
async def disable_all_failures():
    """Disable all active failure modes at once."""
    failure_service.disable_all()
    for mode in failure_service.FAILURE_MODES:
        ecommerce_active_failures.labels(mode=mode).set(0)
    return {"message": "All failure modes disabled", "active_count": 0}


@router.get("/admin/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Return aggregate statistics for the operator dashboard."""
    payment_stats = await payment_service.get_payment_stats(db)
    order_stats = await order_service.get_order_stats(db)
    inventory_levels = await inventory_service.get_inventory_levels(db)

    return {
        "payments": payment_stats,
        "orders": order_stats,
        "inventory": {
            "total_products": len(inventory_levels),
            "critical_stock": sum(1 for p in inventory_levels if p["status"] == "critical"),
            "low_stock": sum(1 for p in inventory_levels if p["status"] == "low"),
            "products": inventory_levels,
        },
        "failures": {
            "active_count": failure_service.get_active_count(),
            "active_modes": failure_service.get_active_modes(),
        },
    }


@router.get("/admin/orders")
async def get_all_orders(db: AsyncSession = Depends(get_db)):
    """Return all orders for the admin orders table."""
    orders = await order_service.get_orders(db, limit=100)

    result = []
    for order in orders:
        result.append({
            "id": order.id,
            "status": order.status,
            "total_amount": float(order.total_amount),
            "items_count": len(order.items),
            "payment_status": order.payment.status if order.payment else "none",
            "created_at": order.created_at.isoformat(),
        })
    return {"orders": result, "total": len(result)}


@router.post("/admin/seed")
async def seed_data(db: AsyncSession = Depends(get_db)):
    """Reseed the database with demo products and users."""
    from app.seed import seed_database
    await seed_database(db)
    return {"message": "Database seeded successfully"}


@router.get("/admin/inventory")
async def get_inventory(db: AsyncSession = Depends(get_db)):
    """Return detailed inventory levels for all products."""
    levels = await inventory_service.get_inventory_levels(db)
    return {"inventory": levels, "total": len(levels)}
