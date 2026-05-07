from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.enums import NotificationType


class Notification(Base):
    __tablename__ = "notifications"

    # ── Campos principales ────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)

    # Mensaje legible para el usuario
    message = Column(Text, nullable=False)

    # Tipo de notificación (para filtrar o mostrar íconos en el frontend)
    type = Column(
        SAEnum(NotificationType),
        nullable=False,
    )

    # Si el usuario ya leyó la notificación
    is_read = Column(Boolean, default=False, nullable=False)

    # ── Claves foráneas ───────────────────────────────────────────
    # Usuario que recibe la notificación
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    # Ticket relacionado (opcional, puede ser una notif de incidente)
    ticket_id = Column(
        Integer,
        ForeignKey("tickets.id"),
        nullable=True,
    )

    # ── Timestamps ────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── Relaciones ────────────────────────────────────────────────
    user = relationship(
        "User",
        back_populates="notifications",
    )
    ticket = relationship(
        "Ticket",
        back_populates="notifications",
    )

    def __repr__(self):
        return f"<Notification id={self.id} user_id={self.user_id} is_read={self.is_read}>"