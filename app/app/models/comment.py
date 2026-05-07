from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    # ── Campos principales ────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)
    body = Column(Text, nullable=False)

    # is_internal: si es True, solo los técnicos y admins pueden verlo
    # si es False, el usuario final también puede verlo
    is_internal = Column(Boolean, default=False, nullable=False)

    # ── Claves foráneas ───────────────────────────────────────────
    ticket_id = Column(
        Integer,
        ForeignKey("tickets.id"),
        nullable=False,
    )
    author_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    # ── Timestamps ────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Relaciones ────────────────────────────────────────────────
    # Ticket al que pertenece este comentario
    ticket = relationship(
        "Ticket",
        back_populates="comments",
    )
    # Usuario que escribió el comentario
    author = relationship(
        "User",
        back_populates="comments",
    )

    def __repr__(self):
        return f"<Comment id={self.id} ticket_id={self.ticket_id} internal={self.is_internal}>"