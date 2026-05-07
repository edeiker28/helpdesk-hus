from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.enums import AssetType, AssetStatus


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)

    # Identificación
    name = Column(String(150), nullable=False)
    asset_tag = Column(String(50), unique=True, nullable=True)  # Código interno
    serial_number = Column(String(100), unique=True, nullable=True)

    # Clasificación
    asset_type = Column(SAEnum(AssetType), nullable=False, default=AssetType.OTHER)
    status = Column(SAEnum(AssetStatus), nullable=False, default=AssetStatus.ACTIVE)

    # Detalles del equipo
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    # Fechas
    purchase_date = Column(Date, nullable=True)
    warranty_expiry = Column(Date, nullable=True)

    # Relaciones
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones ORM
    location = relationship("Location", back_populates="assets")
    assigned_to = relationship("User", back_populates="assets")

    def __repr__(self):
        return f"<Asset id={self.id} name={self.name} type={self.asset_type}>"
