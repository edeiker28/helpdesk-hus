from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ticket import Ticket
from app.models.incident import Incident
from app.models.user import User
from app.core.dependencies import require_technician_or_admin
from app.utils.enums import TicketStatus, TicketPriority, IncidentStatus

router = APIRouter()


@router.get("/")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    tickets_open = db.query(Ticket).filter(Ticket.status == TicketStatus.OPEN).count()
    tickets_in_progress = db.query(Ticket).filter(Ticket.status == TicketStatus.IN_PROGRESS).count()
    tickets_resolved = db.query(Ticket).filter(Ticket.status == TicketStatus.RESOLVED).count()
    tickets_closed = db.query(Ticket).filter(Ticket.status == TicketStatus.CLOSED).count()

    tickets_by_priority = {
        "low": db.query(Ticket).filter(Ticket.priority == TicketPriority.LOW).count(),
        "medium": db.query(Ticket).filter(Ticket.priority == TicketPriority.MEDIUM).count(),
        "high": db.query(Ticket).filter(Ticket.priority == TicketPriority.HIGH).count(),
        "critical": db.query(Ticket).filter(Ticket.priority == TicketPriority.CRITICAL).count(),
    }

    incidents_open = db.query(Incident).filter(Incident.status == IncidentStatus.OPEN).count()
    incidents_in_progress = db.query(Incident).filter(Incident.status == IncidentStatus.IN_PROGRESS).count()
    incidents_resolved = db.query(Incident).filter(Incident.status == IncidentStatus.RESOLVED).count()
    incidents_closed = db.query(Incident).filter(Incident.status == IncidentStatus.CLOSED).count()

    total_users = db.query(User).count()

    return {
        "tickets": {
            "open": tickets_open,
            "in_progress": tickets_in_progress,
            "resolved": tickets_resolved,
            "closed": tickets_closed,
            "total": tickets_open + tickets_in_progress + tickets_resolved + tickets_closed,
        },
        "tickets_by_priority": tickets_by_priority,
        "incidents": {
            "open": incidents_open,
            "in_progress": incidents_in_progress,
            "resolved": incidents_resolved,
            "closed": incidents_closed,
        },
        "total_users": total_users,
    }