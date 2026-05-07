from pydantic import BaseModel
from datetime import datetime
from app.schemas.user import UserSummary


class AttachmentResponse(BaseModel):
    id: int
    original_filename: str
    stored_filename: str
    file_path: str
    content_type: str
    file_size: int
    ticket_id: int
    uploaded_by_id: int
    created_at: datetime
    uploaded_by: UserSummary

    model_config = {"from_attributes": True}


class AttachmentSummary(BaseModel):
    id: int
    original_filename: str
    content_type: str
    file_size: int
    created_at: datetime

    model_config = {"from_attributes": True}