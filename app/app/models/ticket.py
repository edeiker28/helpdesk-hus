from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.enums import TicketStatus, TicketPriority, TicketCategory


class Ticket(Base):
    __tablename__ = "tickets"

    # ── Campos principales ────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(
        SAEnum(TicketCategory),
        nullable=False,
        default=TicketCategory.OTHER,
    )
    priority = Column(
        SAEnum(TicketPriority),
        nullable=False,
        default=TicketPriority.MEDIUM,
    )
    status = Column(
        SAEnum(TicketStatus),
        nullable=False,
        default=TicketStatus.OPEN,
    )

    # ── Claves foráneas ───────────────────────────────────────────
    # Usuario que creó el ticket
    created_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    # Técnico asignado (puede estar sin asignar)
    assigned_to_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )
    # Incidente al que pertenece (opcional)
    incident_id = Column(
        Integer,
        ForeignKey("incidents.id"),
        nullable=True,
    )

    # ── Timestamps ────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # ── Relaciones ────────────────────────────────────────────────
    # Usuario creador
    created_by = relationship(
        "User",
        foreign_keys=[created_by_id],
        back_populates="tickets_created",
    )
    # Técnico asignado
    assigned_to = relationship(
        "User",
        foreign_keys=[assigned_to_id],
        back_populates="tickets_assigned",
    )
    # Incidente al que pertenece
    incident = relationship(
        "Incident",
        back_populates="tickets",
    )
    # Comentarios del ticket
    comments = relationship(
        "Comment",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )
    # Archivos adjuntos del ticket
    attachments = relationship(
        "Attachment",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )
    # Notificaciones relacionadas al ticket
    notifications = relationship(
        "Notification",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Ticket id={self.id} title={self.title} status={self.status}>"