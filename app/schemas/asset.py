from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from app.utils.enums import AssetType, AssetStatus
from app.schemas.user import UserSummary
from app.schemas.location import LocationSummary


class AssetBase(BaseModel):
    name: str
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    asset_type: AssetType = AssetType.OTHER
    status: AssetStatus = AssetStatus.ACTIVE
    brand: Optional[str] = None
    model: Optional[str] = None
    description: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    location_id: Optional[int] = None
    assigned_to_id: Optional[int] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    asset_type: Optional[AssetType] = None
    status: Optional[AssetStatus] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    description: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    location_id: Optional[int] = None
    assigned_to_id: Optional[int] = None


class AssetResponse(AssetBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    location: Optional[LocationSummary] = None
    assigned_to: Optional[UserSummary] = None

    model_config = {"from_attributes": True}


class AssetSummary(BaseModel):
    id: int
    name: str
    asset_tag: Optional[str] = None
    asset_type: AssetType
    status: AssetStatus
    brand: Optional[str] = None
    model: Optional[str] = None
    location_id: Optional[int] = None
    assigned_to_id: Optional[int] = None

    model_config = {"from_attributes": True}
