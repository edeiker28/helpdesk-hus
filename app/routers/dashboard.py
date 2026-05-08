from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ticket import Ticket
from app.models.incident import Incident
from app.models.user import User
from app.models.asset import Asset
from app.core.dependencies import require_technician_or_admin
from app.utils.enums import TicketStatus, TicketPriority, IncidentStatus, AssetStatus
from app.services.sla_service import get_sla_info, get_sla_summary

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
    total_assets = db.query(Asset).count()
    active_assets = db.query(Asset).filter(Asset.status == AssetStatus.ACTIVE).count()

    # SLA Summary
    active_tickets = db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
    ).all()
    sla_summary = get_sla_summary(active_tickets)

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
        "assets": {
            "total": total_assets,
            "active": active_assets,
        },
        "sla": sla_summary,
    }


@router.get("/sla")
def get_sla_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Endpoint específico para ver el estado SLA de todos los tickets activos."""
    active_tickets = db.query(Ticket).filter(
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
    ).all()

    tickets_with_sla = []
    for ticket in active_tickets:
        sla_info = get_sla_info(ticket)
        tickets_with_sla.append({
            "id": ticket.id,
            "title": ticket.title,
            "priority": ticket.priority.value,
            "status": ticket.status.value,
            "created_at": ticket.created_at.isoformat(),
            "assigned_to_id": ticket.assigned_to_id,
            "location_id": ticket.location_id,
            "sla": sla_info,
        })

    # Ordenar por estado SLA: primero los vencidos, luego warnings, luego ok
    order = {"breached": 0, "warning": 1, "ok": 2, "completed": 3}
    tickets_with_sla.sort(key=lambda x: order.get(x["sla"]["status"], 99))

    summary = get_sla_summary(active_tickets)

    return {
        "summary": summary,
        "tickets": tickets_with_sla,
    }