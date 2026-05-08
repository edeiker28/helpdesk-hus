from datetime import datetime, timezone, timedelta
from app.utils.enums import TicketPriority, TicketStatus

# ── Tiempos máximos por prioridad (en horas) ──────────────────
SLA_HOURS = {
    TicketPriority.CRITICAL: 1,
    TicketPriority.HIGH: 4,
    TicketPriority.MEDIUM: 8,
    TicketPriority.LOW: 24,
}


def get_sla_info(ticket) -> dict:
    """
    Calcula el estado del SLA para un ticket.
    Retorna un dict con:
    - sla_hours: tiempo máximo permitido
    - elapsed_hours: tiempo transcurrido
    - remaining_hours: tiempo restante
    - percentage_used: porcentaje del tiempo usado
    - status: ok | warning | breached
    - is_breached: si el SLA fue incumplido
    - breached_hours: cuántas horas lleva vencido
    """
    # Tickets resueltos o cerrados no tienen SLA activo
    if ticket.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
        return {
            "sla_hours": SLA_HOURS.get(ticket.priority, 8),
            "elapsed_hours": 0,
            "remaining_hours": 0,
            "percentage_used": 0,
            "status": "completed",
            "is_breached": False,
            "breached_hours": 0,
        }

    sla_hours = SLA_HOURS.get(ticket.priority, 8)
    now = datetime.now(timezone.utc)

    # Asegurar que created_at tenga timezone
    created_at = ticket.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    elapsed = now - created_at
    elapsed_hours = elapsed.total_seconds() / 3600
    remaining_hours = sla_hours - elapsed_hours
    percentage_used = (elapsed_hours / sla_hours) * 100

    is_breached = elapsed_hours > sla_hours
    breached_hours = max(0, elapsed_hours - sla_hours)

    if is_breached:
        status = "breached"
    elif percentage_used >= 75:
        status = "warning"
    else:
        status = "ok"

    return {
        "sla_hours": sla_hours,
        "elapsed_hours": round(elapsed_hours, 2),
        "remaining_hours": round(remaining_hours, 2),
        "percentage_used": round(percentage_used, 2),
        "status": status,
        "is_breached": is_breached,
        "breached_hours": round(breached_hours, 2),
    }


def get_sla_summary(tickets: list) -> dict:
    """
    Genera un resumen de cumplimiento de SLA para una lista de tickets.
    """
    active_tickets = [t for t in tickets if t.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]]

    ok = 0
    warning = 0
    breached = 0

    for ticket in active_tickets:
        info = get_sla_info(ticket)
        if info["status"] == "breached":
            breached += 1
        elif info["status"] == "warning":
            warning += 1
        else:
            ok += 1

    total = len(active_tickets)
    compliance_rate = ((ok + warning) / total * 100) if total > 0 else 100

    return {
        "total_active": total,
        "ok": ok,
        "warning": warning,
        "breached": breached,
        "compliance_rate": round(compliance_rate, 2),
    }