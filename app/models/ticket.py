from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.enums import TicketStatus, TicketPriority, TicketCategory


class Ticket(Base):
    __tablename__ = "tickets"

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
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    created_by = relationship(
        "User",
        foreign_keys=[created_by_id],
        back_populates="tickets_created",
    )
    assigned_to = relationship(
        "User",
        foreign_keys=[assigned_to_id],
        back_populates="tickets_assigned",
    )
    incident = relationship("Incident", back_populates="tickets")
    comments = relationship(
        "Comment",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )
    attachments = relationship(
        "Attachment",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "Notification",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Ticket id={self.id} title={self.title} status={self.status}>"