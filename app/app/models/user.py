from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.enums import UserRole


class User(Base):
    __tablename__ = "users"

    # ── Campos principales ────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.END_USER)
    is_active = Column(Boolean, default=True, nullable=False)

    # ── Campos adicionales para el HUS ───────────────────────────
    department = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)

    # ── Timestamps ───────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Relaciones ───────────────────────────────────────────────
    # Tickets creados por este usuario
    tickets_created = relationship(
        "Ticket",
        foreign_keys="Ticket.created_by_id",
        back_populates="created_by",
    )
    # Tickets asignados a este usuario (si es técnico)
    tickets_assigned = relationship(
        "Ticket",
        foreign_keys="Ticket.assigned_to_id",
        back_populates="assigned_to",
    )
    # Comentarios escritos por este usuario
    comments = relationship("Comment", back_populates="author")

    # Incidentes creados por este usuario
    incidents_created = relationship("Incident", back_populates="created_by")

    # Notificaciones de este usuario
    notifications = relationship("Notification", back_populates="user")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"