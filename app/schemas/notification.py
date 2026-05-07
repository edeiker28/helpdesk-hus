from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.utils.enums import NotificationType


class NotificationResponse(BaseModel):
    id: int
    message: str
    type: NotificationType
    is_read: bool
    user_id: int
    ticket_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationUpdate(BaseModel):
    is_read: bool = True
