from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.enums import IncidentStatus, IncidentSeverity


class Incident(Base):
    __tablename__ = "incidents"

    # ── Campos principales ────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        SAEnum(IncidentStatus),
        nullable=False,
        default=IncidentStatus.OPEN,
    )
    severity = Column(
        SAEnum(IncidentSeverity),
        nullable=False,
        default=IncidentSeverity.MEDIUM,
    )

    # ── Clave foránea ─────────────────────────────────────────────
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # ── Timestamps ───────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # ── Relaciones ───────────────────────────────────────────────
    # Usuario que creó el incidente
    created_by = relationship(
        "User",
        back_populates="incidents_created",
    )
    # Tickets agrupados bajo este incidente
    tickets = relationship(
        "Ticket",
        back_populates="incident",
    )

    def __repr__(self):
        return f"<Incident id={self.id} title={self.title} status={self.status}>"