from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import csv
import io
from datetime import datetime, timezone

from app.database import get_db
from app.models.ticket import Ticket
from app.models.user import User
from app.models.asset import Asset
from app.models.location import Location
from app.core.dependencies import require_technician_or_admin
from app.utils.enums import TicketStatus, TicketPriority
from app.services.sla_service import get_sla_info

router = APIRouter()


@router.get("/tickets-by-technician")
def tickets_by_technician(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Reporte de tickets agrupados por técnico."""
    technicians = db.query(User).filter(User.role == 'TECHNICIAN').all()

    result = []
    for tech in technicians:
        total = db.query(Ticket).filter(Ticket.assigned_to_id == tech.id).count()
        open_t = db.query(Ticket).filter(
            Ticket.assigned_to_id == tech.id,
            Ticket.status == TicketStatus.OPEN
        ).count()
        in_progress = db.query(Ticket).filter(
            Ticket.assigned_to_id == tech.id,
            Ticket.status == TicketStatus.IN_PROGRESS
        ).count()
        resolved = db.query(Ticket).filter(
            Ticket.assigned_to_id == tech.id,
            Ticket.status == TicketStatus.RESOLVED
        ).count()
        closed = db.query(Ticket).filter(
            Ticket.assigned_to_id == tech.id,
            Ticket.status == TicketStatus.CLOSED
        ).count()

        result.append({
            "technician_id": tech.id,
            "technician_name": tech.full_name,
            "email": tech.email,
            "total": total,
            "open": open_t,
            "in_progress": in_progress,
            "resolved": resolved,
            "closed": closed,
        })

    result.sort(key=lambda x: x["total"], reverse=True)
    return result


@router.get("/tickets-by-location")
def tickets_by_location(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Reporte de tickets agrupados por sede."""
    locations = db.query(Location).all()

    result = []
    for loc in locations:
        total = db.query(Ticket).filter(Ticket.location_id == loc.id).count()
        open_t = db.query(Ticket).filter(
            Ticket.location_id == loc.id,
            Ticket.status == TicketStatus.OPEN
        ).count()
        in_progress = db.query(Ticket).filter(
            Ticket.location_id == loc.id,
            Ticket.status == TicketStatus.IN_PROGRESS
        ).count()
        resolved = db.query(Ticket).filter(
            Ticket.location_id == loc.id,
            Ticket.status == TicketStatus.RESOLVED
        ).count()
        critical = db.query(Ticket).filter(
            Ticket.location_id == loc.id,
            Ticket.priority == TicketPriority.CRITICAL
        ).count()

        result.append({
            "location_id": loc.id,
            "location_name": loc.name,
            "total": total,
            "open": open_t,
            "in_progress": in_progress,
            "resolved": resolved,
            "critical": critical,
        })

    result.sort(key=lambda x: x["total"], reverse=True)
    return result


@router.get("/assets-by-location")
def assets_by_location(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Reporte de activos agrupados por sede."""
    locations = db.query(Location).all()

    result = []
    for loc in locations:
        total = db.query(Asset).filter(Asset.location_id == loc.id).count()
        active = db.query(Asset).filter(
            Asset.location_id == loc.id,
            Asset.status == 'ACTIVE'
        ).count()
        in_repair = db.query(Asset).filter(
            Asset.location_id == loc.id,
            Asset.status == 'IN_REPAIR'
        ).count()
        maintenance = db.query(Asset).filter(
            Asset.location_id == loc.id,
            Asset.status == 'MAINTENANCE'
        ).count()
        retired = db.query(Asset).filter(
            Asset.location_id == loc.id,
            Asset.status == 'RETIRED'
        ).count()

        result.append({
            "location_id": loc.id,
            "location_name": loc.name,
            "total": total,
            "active": active,
            "in_repair": in_repair,
            "maintenance": maintenance,
            "retired": retired,
        })

    result.sort(key=lambda x: x["total"], reverse=True)
    return result


@router.get("/sla-by-location")
def sla_by_location(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Reporte de cumplimiento SLA por sede."""
    locations = db.query(Location).all()

    result = []
    for loc in locations:
        active_tickets = db.query(Ticket).filter(
            Ticket.location_id == loc.id,
            Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
        ).all()

        ok = warning = breached = 0
        for ticket in active_tickets:
            sla = get_sla_info(ticket)
            if sla["status"] == "breached":
                breached += 1
            elif sla["status"] == "warning":
                warning += 1
            else:
                ok += 1

        total = len(active_tickets)
        compliance = round(((ok + warning) / total * 100), 2) if total > 0 else 100

        result.append({
            "location_id": loc.id,
            "location_name": loc.name,
            "total_active": total,
            "ok": ok,
            "warning": warning,
            "breached": breached,
            "compliance_rate": compliance,
        })

    result.sort(key=lambda x: x["compliance_rate"])
    return result


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Reporte ejecutivo general."""
    total_tickets = db.query(Ticket).count()
    total_users = db.query(User).count()
    total_assets = db.query(Asset).count()
    total_locations = db.query(Location).count()

    tickets_by_status = {
        "open": db.query(Ticket).filter(Ticket.status == TicketStatus.OPEN).count(),
        "in_progress": db.query(Ticket).filter(Ticket.status == TicketStatus.IN_PROGRESS).count(),
        "resolved": db.query(Ticket).filter(Ticket.status == TicketStatus.RESOLVED).count(),
        "closed": db.query(Ticket).filter(Ticket.status == TicketStatus.CLOSED).count(),
    }

    tickets_by_priority = {
        "critical": db.query(Ticket).filter(Ticket.priority == TicketPriority.CRITICAL).count(),
        "high": db.query(Ticket).filter(Ticket.priority == TicketPriority.HIGH).count(),
        "medium": db.query(Ticket).filter(Ticket.priority == TicketPriority.MEDIUM).count(),
        "low": db.query(Ticket).filter(Ticket.priority == TicketPriority.LOW).count(),
    }

    resolution_rate = round(
        (tickets_by_status["resolved"] + tickets_by_status["closed"]) / total_tickets * 100, 2
    ) if total_tickets > 0 else 0

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "totals": {
            "tickets": total_tickets,
            "users": total_users,
            "assets": total_assets,
            "locations": total_locations,
        },
        "tickets_by_status": tickets_by_status,
        "tickets_by_priority": tickets_by_priority,
        "resolution_rate": resolution_rate,
    }


@router.get("/export/tickets")
def export_tickets_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Exporta todos los tickets a CSV."""
    tickets = db.query(Ticket).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "ID", "Título", "Categoría", "Prioridad", "Estado",
        "Creado por", "Asignado a", "Sede", "Fecha creación", "Fecha cierre"
    ])

    for t in tickets:
        loc = db.query(Location).filter(Location.id == t.location_id).first()
        assigned = db.query(User).filter(User.id == t.assigned_to_id).first()
        created_by = db.query(User).filter(User.id == t.created_by_id).first()

        writer.writerow([
            t.id,
            t.title,
            t.category.value if t.category else "",
            t.priority.value if t.priority else "",
            t.status.value if t.status else "",
            created_by.full_name if created_by else "",
            assigned.full_name if assigned else "Sin asignar",
            loc.name if loc else "Sin sede",
            t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
            t.closed_at.strftime("%Y-%m-%d %H:%M") if t.closed_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tickets_hus.csv"}
    )


@router.get("/export/assets")
def export_assets_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    """Exporta todos los activos a CSV."""
    assets = db.query(Asset).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "ID", "Nombre", "TAG", "Tipo", "Estado", "Marca",
        "Modelo", "Serial", "Sede", "Fecha compra", "Garantía hasta"
    ])

    for a in assets:
        loc = db.query(Location).filter(Location.id == a.location_id).first()
        writer.writerow([
            a.id,
            a.name,
            a.asset_tag or "",
            a.asset_type.value if a.asset_type else "",
            a.status.value if a.status else "",
            a.brand or "",
            a.model or "",
            a.serial_number or "",
            loc.name if loc else "Sin sede",
            a.purchase_date.strftime("%Y-%m-%d") if a.purchase_date else "",
            a.warranty_expiry.strftime("%Y-%m-%d") if a.warranty_expiry else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=activos_hus.csv"}
    )