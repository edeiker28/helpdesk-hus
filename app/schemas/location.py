from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LocationBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class LocationResponse(LocationBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LocationSummary(BaseModel):
    id: int
    name: str
    is_active: bool

    model_config = {"from_attributes": True}
