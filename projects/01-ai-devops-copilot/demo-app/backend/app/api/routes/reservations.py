import asyncio
import structlog
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.database import get_db, Reservation, Table
from app.services.failure_service import failure_service
from app.services.metrics_service import metrics

router = APIRouter()
logger = structlog.get_logger()


class ReservationCreate(BaseModel):
    customer_name: str
    customer_email: str
    table_id: int
    party_size: int
    date: str
    time_slot: str


@router.post("/reservations", status_code=201)
async def create_reservation(
    data: ReservationCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new table reservation.
    Checks for double-booking conflicts.
    Subject to `reservation_conflict` failure which forces a 409 error.
    """
    logger.info(
        "reservation_create_attempt",
        customer=data.customer_name,
        table_id=data.table_id,
        date=data.date,
        time_slot=data.time_slot,
        failure_active=failure_service.is_active("reservation_conflict"),
    )

    # Failure injection: reservation_conflict always raises 409
    if failure_service.is_active("reservation_conflict"):
        logger.error(
            "reservation_conflict_failure_active",
            failure_type="reservation_conflict",
            customer=data.customer_name,
            table_id=data.table_id,
        )
        metrics.reservations_total.labels(status="conflict_error").inc()
        raise HTTPException(
            status_code=409,
            detail="Reservation system error: double-booking conflict detected. Please try a different time slot.",
        )

    # Verify table exists
    table = db.query(Table).filter(Table.id == data.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail=f"Table {data.table_id} not found")

    # Check party size fits the table
    if data.party_size > table.capacity:
        raise HTTPException(
            status_code=400,
            detail=f"Party size {data.party_size} exceeds table capacity {table.capacity}",
        )

    # Check for existing reservation on same table + date + time slot
    conflict = (
        db.query(Reservation)
        .filter(
            Reservation.table_id == data.table_id,
            Reservation.date == data.date,
            Reservation.time_slot == data.time_slot,
            Reservation.status == "confirmed",
        )
        .first()
    )

    if conflict:
        logger.warning(
            "reservation_conflict_detected",
            table_id=data.table_id,
            date=data.date,
            time_slot=data.time_slot,
            existing_reservation_id=conflict.id,
        )
        metrics.reservations_total.labels(status="conflict").inc()
        raise HTTPException(
            status_code=409,
            detail=f"Table {data.table_id} is already booked for {data.date} at {data.time_slot}",
        )

    reservation = Reservation(
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        table_id=data.table_id,
        party_size=data.party_size,
        date=data.date,
        time_slot=data.time_slot,
        status="confirmed",
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    metrics.reservations_total.labels(status="confirmed").inc()

    logger.info(
        "reservation_created",
        reservation_id=reservation.id,
        customer=data.customer_name,
        table_id=data.table_id,
        date=data.date,
        time_slot=data.time_slot,
    )

    return {
        "id": reservation.id,
        "customer_name": reservation.customer_name,
        "customer_email": reservation.customer_email,
        "table_id": reservation.table_id,
        "table_number": table.number,
        "party_size": reservation.party_size,
        "date": reservation.date,
        "time_slot": reservation.time_slot,
        "status": reservation.status,
        "created_at": reservation.created_at.isoformat(),
    }


@router.get("/reservations")
async def list_reservations(db: Session = Depends(get_db)):
    """List all reservations. Used by the operator dashboard."""
    reservations = db.query(Reservation).order_by(Reservation.created_at.desc()).all()

    result = []
    for r in reservations:
        table = db.query(Table).filter(Table.id == r.table_id).first()
        result.append({
            "id": r.id,
            "customer_name": r.customer_name,
            "customer_email": r.customer_email,
            "table_id": r.table_id,
            "table_number": table.number if table else None,
            "party_size": r.party_size,
            "date": r.date,
            "time_slot": r.time_slot,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        })

    logger.info("reservations_listed", count=len(result))
    return {"reservations": result, "total": len(result)}


@router.get("/reservations/{reservation_id}")
async def get_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """Get a single reservation by ID."""
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail=f"Reservation {reservation_id} not found")

    table = db.query(Table).filter(Table.id == reservation.table_id).first()

    return {
        "id": reservation.id,
        "customer_name": reservation.customer_name,
        "customer_email": reservation.customer_email,
        "table_id": reservation.table_id,
        "table_number": table.number if table else None,
        "party_size": reservation.party_size,
        "date": reservation.date,
        "time_slot": reservation.time_slot,
        "status": reservation.status,
        "created_at": reservation.created_at.isoformat(),
    }


@router.delete("/reservations/{reservation_id}")
async def cancel_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """Cancel a reservation by ID."""
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail=f"Reservation {reservation_id} not found")

    if reservation.status == "cancelled":
        raise HTTPException(status_code=400, detail="Reservation is already cancelled")

    reservation.status = "cancelled"
    db.commit()

    metrics.reservations_total.labels(status="cancelled").inc()

    logger.info(
        "reservation_cancelled",
        reservation_id=reservation_id,
        customer=reservation.customer_name,
    )

    return {"message": f"Reservation {reservation_id} cancelled successfully", "id": reservation_id}
