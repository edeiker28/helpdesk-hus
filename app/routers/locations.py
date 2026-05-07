from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse, LocationSummary
from app.models.location import Location
from app.models.user import User
from app.core.dependencies import get_current_user, require_admin

router = APIRouter()


@router.get("/", response_model=List[LocationResponse])
def list_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Location).all()


@router.post("/", response_model=LocationResponse, status_code=201)
def create_location(
    data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(Location).filter(Location.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una sede con ese nombre")
    location = Location(**data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    return location


@router.patch("/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: int,
    data: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(location, field, value)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}", status_code=204)
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    db.delete(location)
    db.commit()


@router.get("/{location_id}/stats")
def location_stats(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    from app.models.ticket import Ticket
    from app.utils.enums import TicketStatus

    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    total_users = db.query(User).filter(User.location_id == location_id).count()
    total_tickets = db.query(Ticket).filter(Ticket.location_id == location_id).count()
    open_tickets = db.query(Ticket).filter(
        Ticket.location_id == location_id,
        Ticket.status == TicketStatus.OPEN
    ).count()

    return {
        "location": location.name,
        "total_users": total_users,
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
    }
