import structlog
from datetime import datetime, date
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends

from app.db.database import get_db, Order, Reservation, Payment
from app.db.seed import seed_database
from app.services.failure_service import failure_service
from app.services.metrics_service import metrics

router = APIRouter()
logger = structlog.get_logger()


@router.get("/admin/failures")
async def get_all_failures():
    """
    Get the status of all failure modes.
    KEY FEATURE: Used by the operator dashboard and AI Copilot.
    """
    all_failures = failure_service.get_all()
    active_count = failure_service.get_active_count()

    # Sync Prometheus gauges
    metrics.update_all_failure_states(all_failures)

    logger.info("admin_failures_queried", active_count=active_count)

    return {
        "failures": all_failures,
        "active_count": active_count,
        "total_modes": len(all_failures),
    }


@router.post("/admin/failures/{mode}/enable")
async def enable_failure(mode: str):
    """
    Enable a failure mode for chaos engineering / AI DevOps demo.
    The AI Copilot will detect the resulting anomalies in metrics and logs.
    """
    success = failure_service.enable(mode)
    if not success:
        valid_modes = list(failure_service.get_all().keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unknown failure mode '{mode}'. Valid modes: {valid_modes}",
        )

    all_failures = failure_service.get_all()
    metrics.update_all_failure_states(all_failures)
    metrics.active_failures.labels(mode=mode).set(1)

    logger.warning(
        "failure_mode_toggled",
        mode=mode,
        action="enable",
        active_failures=failure_service.get_active_count(),
    )

    return {
        "mode": mode,
        "active": True,
        "message": f"Failure mode '{mode}' is now ENABLED",
        "description": all_failures[mode]["description"],
    }


@router.post("/admin/failures/{mode}/disable")
async def disable_failure(mode: str):
    """
    Disable a failure mode (recovery action).
    The AI Copilot calls this endpoint to auto-remediate incidents.
    """
    success = failure_service.disable(mode)
    if not success:
        valid_modes = list(failure_service.get_all().keys())
        raise HTTPException(
            status_code=400,
            detail=f"Unknown failure mode '{mode}'. Valid modes: {valid_modes}",
        )

    metrics.active_failures.labels(mode=mode).set(0)

    logger.info(
        "failure_mode_toggled",
        mode=mode,
        action="disable",
        active_failures=failure_service.get_active_count(),
    )

    return {
        "mode": mode,
        "active": False,
        "message": f"Failure mode '{mode}' is now DISABLED — system recovering",
    }


@router.get("/admin/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    """System statistics for the operator dashboard."""
    today_str = str(date.today())

    total_orders = db.query(Order).count()
    total_reservations = db.query(Reservation).count()
    total_payments = db.query(Payment).count()

    # Revenue today (sum of successful payments today)
    all_payments = db.query(Payment).filter(Payment.status == "success").all()
    revenue_today = sum(
        p.amount for p in all_payments
        if p.created_at.date() == date.today()
    )

    # Order breakdown by status
    order_statuses = {}
    for status in ["pending", "preparing", "ready", "served", "cancelled"]:
        order_statuses[status] = db.query(Order).filter(Order.status == status).count()

    # Payment breakdown by status
    payment_statuses = {}
    for status in ["pending", "success", "failed", "timeout"]:
        payment_statuses[status] = db.query(Payment).filter(Payment.status == status).count()

    active_failures = failure_service.get_active_count()

    logger.info(
        "admin_stats_queried",
        total_orders=total_orders,
        revenue_today=revenue_today,
        active_failures=active_failures,
    )

    return {
        "total_orders": total_orders,
        "total_reservations": total_reservations,
        "total_payments": total_payments,
        "revenue_today": round(revenue_today, 2),
        "order_statuses": order_statuses,
        "payment_statuses": payment_statuses,
        "active_failures": active_failures,
    }


@router.post("/admin/seed")
async def trigger_seed():
    """Re-seed the database with sample data."""
    logger.info("admin_seed_triggered")
    result = seed_database()
    return result
