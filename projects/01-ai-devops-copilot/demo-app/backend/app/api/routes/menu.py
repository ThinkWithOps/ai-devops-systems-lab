import time
import asyncio
import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db, MenuItem
from app.services.failure_service import failure_service
from app.services.metrics_service import metrics

router = APIRouter()
logger = structlog.get_logger()


@router.get("/menu")
async def get_menu(db: Session = Depends(get_db)):
    """
    Returns all available menu items grouped by category.
    Subject to the `slow_menu` failure mode which adds a 2-second delay.
    """
    start_time = time.time()

    logger.info("menu_request_received", failure_active=failure_service.is_active("slow_menu"))

    # Failure injection: slow_menu adds 2s delay
    if failure_service.is_active("slow_menu"):
        logger.warning(
            "slow_menu_failure_active",
            delay_seconds=2,
            failure_type="slow_menu",
        )
        await asyncio.sleep(2)

    items = db.query(MenuItem).filter(MenuItem.is_available == True).all()

    # Group by category
    categories: dict = {}
    for item in items:
        cat = item.category
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "description": item.description,
            "price": item.price,
            "is_available": item.is_available,
            "prep_time_minutes": item.prep_time_minutes,
        })

    duration = time.time() - start_time
    metrics.menu_request_duration.observe(duration)

    logger.info(
        "menu_request_complete",
        item_count=len(items),
        category_count=len(categories),
        duration_seconds=round(duration, 3),
    )

    return {
        "categories": list(categories.keys()),
        "items_by_category": categories,
        "total_items": len(items),
    }


@router.get("/menu/{item_id}")
async def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    """Returns a single menu item by ID."""
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        logger.warning("menu_item_not_found", item_id=item_id)
        raise HTTPException(status_code=404, detail=f"Menu item {item_id} not found")

    logger.info("menu_item_fetched", item_id=item_id, name=item.name)
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "description": item.description,
        "price": item.price,
        "is_available": item.is_available,
        "prep_time_minutes": item.prep_time_minutes,
    }
