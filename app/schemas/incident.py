from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.utils.enums import IncidentStatus, IncidentSeverity
from app.schemas.user import UserSummary


class IncidentBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: IncidentSeverity = IncidentSeverity.MEDIUM


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None


class IncidentResponse(IncidentBase):
    id: int
    status: IncidentStatus
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_by: UserSummary

    model_config = {"from_attributes": True}


class IncidentSummary(BaseModel):
    id: int
    title: str
    status: IncidentStatus
    severity: IncidentSeverity
    created_at: datetime
    created_by: UserSummary

    model_config = {"from_attributes": True}