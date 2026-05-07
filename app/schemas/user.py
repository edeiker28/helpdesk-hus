from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.utils.enums import UserRole


# ── Base ──────────────────────────────────────────────────────────
class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.END_USER
    department: Optional[str] = None
    phone: Optional[str] = None


# ── Crear usuario (entrada) ───────────────────────────────────────
class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


# ── Actualizar usuario (todos los campos opcionales) ──────────────
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


# ── Respuesta (salida) — nunca incluye la contraseña ─────────────
class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Respuesta resumida (para listas) ─────────────────────────────
class UserSummary(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole

    model_config = {"from_attributes": True}