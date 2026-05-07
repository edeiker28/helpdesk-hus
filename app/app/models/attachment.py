from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Attachment(Base):
    __tablename__ = "attachments"

    # ── Campos principales ────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True)

    # Nombre original del archivo (como lo subió el usuario)
    original_filename = Column(String(255), nullable=False)

    # Nombre con el que se guardó en disco (UUID + extensión)
    # Evita colisiones y caracteres especiales en el nombre
    stored_filename = Column(String(255), nullable=False, unique=True)

    # Ruta relativa dentro del directorio de uploads
    file_path = Column(String(500), nullable=False)

    # Tipo MIME del archivo (image/png, application/pdf, etc.)
    content_type = Column(String(100), nullable=False)

    # Tamaño del archivo en bytes
    file_size = Column(BigInteger, nullable=False)

    # ── Claves foráneas ───────────────────────────────────────────
    ticket_id = Column(
        Integer,
        ForeignKey("tickets.id"),
        nullable=False,
    )
    uploaded_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    # ── Timestamps ────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── Relaciones ────────────────────────────────────────────────
    ticket = relationship(
        "Ticket",
        back_populates="attachments",
    )
    uploaded_by = relationship(
        "User",
    )

    def __repr__(self):
        return f"<Attachment id={self.id} filename={self.original_filename} ticket_id={self.ticket_id}>"