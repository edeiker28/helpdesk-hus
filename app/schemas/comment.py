from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserSummary


class CommentBase(BaseModel):
    body: str
    is_internal: bool = False


class CommentCreate(CommentBase):
    ticket_id: int


class CommentUpdate(BaseModel):
    body: Optional[str] = None
    is_internal: Optional[bool] = None


class CommentResponse(CommentBase):
    id: int
    ticket_id: int
    author_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: UserSummary

    model_config = {"from_attributes": True}