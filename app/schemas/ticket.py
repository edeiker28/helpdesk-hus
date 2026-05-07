from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.utils.enums import TicketStatus, TicketPriority, TicketCategory
from app.schemas.user import UserSummary


class TicketBase(BaseModel):
    title: str
    description: str
    category: TicketCategory = TicketCategory.OTHER
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketCreate(TicketBase):
    incident_id: Optional[int] = None
    location_id: Optional[int] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TicketCategory] = None
    priority: Optional[TicketPriority] = None
    status: Optional[TicketStatus] = None
    assigned_to_id: Optional[int] = None
    incident_id: Optional[int] = None
    location_id: Optional[int] = None


class TicketResponse(TicketBase):
    id: int
    status: TicketStatus
    created_by_id: int
    assigned_to_id: Optional[int] = None
    incident_id: Optional[int] = None
    location_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_by: UserSummary
    assigned_to: Optional[UserSummary] = None

    model_config = {"from_attributes": True}


class TicketSummary(BaseModel):
    id: int
    title: str
    status: TicketStatus
    priority: TicketPriority
    category: TicketCategory
    location_id: Optional[int] = None
    created_at: datetime
    created_by: UserSummary
    assigned_to: Optional[UserSummary] = None

    model_config = {"from_attributes": True}
