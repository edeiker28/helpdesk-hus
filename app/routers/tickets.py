from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.database import get_db
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketSummary
from app.models.ticket import Ticket
from app.models.user import User
from app.core.dependencies import get_current_user, require_technician_or_admin
from app.utils.enums import TicketStatus, UserRole
from app.services.notification_service import create_notification
from app.utils.enums import NotificationType

router = APIRouter()


@router.post("/", response_model=TicketResponse, status_code=201)
def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = Ticket(
        title=data.title,
        description=data.description,
        category=data.category,
        priority=data.priority,
        incident_id=data.incident_id,
        created_by_id=current_user.id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    create_notification(
        db=db,
        user_id=current_user.id,
        message=f"Tu ticket '{ticket.title}' fue creado exitosamente.",
        type=NotificationType.TICKET_CREATED,
        ticket_id=ticket.id,
    )
    return ticket


@router.get("/", response_model=List[TicketSummary])
def list_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.END_USER:
        return db.query(Ticket).filter(
            Ticket.created_by_id == current_user.id
        ).all()
    if current_user.role == UserRole.TECHNICIAN:
        return db.query(Ticket).filter(
            Ticket.assigned_to_id == current_user.id
        ).all()
    return db.query(Ticket).all()


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    if current_user.role == UserRole.END_USER and ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin permiso para ver este ticket")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    old_status = ticket.status
    old_assigned = ticket.assigned_to_id

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ticket, field, value)

    if data.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
        ticket.closed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(ticket)

    if data.status and data.status != old_status:
        create_notification(
            db=db,
            user_id=ticket.created_by_id,
            message=f"Tu ticket '{ticket.title}' cambió a estado: {ticket.status.value}",
            type=NotificationType.TICKET_UPDATED,
            ticket_id=ticket.id,
        )

    if data.assigned_to_id and data.assigned_to_id != old_assigned:
        create_notification(
            db=db,
            user_id=data.assigned_to_id,
            message=f"Se te asignó el ticket '{ticket.title}'",
            type=NotificationType.TICKET_ASSIGNED,
            ticket_id=ticket.id,
        )

    return ticket


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    db.delete(ticket)
    db.commit()