from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.utils.enums import UserRole


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.END_USER
    department: Optional[str] = None
    phone: Optional[str] = None
    location_id: Optional[int] = None


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    location_id: Optional[int] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    location_id: Optional[int] = None

    model_config = {"from_attributes": True}
