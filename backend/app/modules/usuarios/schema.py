"""Schemas Pydantic para Usuario y Auth."""

from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class UsuarioCreate(BaseModel):
    """Schema para crear un nuevo usuario."""
    nombre: str = Field(min_length=2, max_length=80)
    apellido: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8)
    celular: Optional[str] = None


class UsuarioLogin(BaseModel):
    """Schema para login."""
    email: EmailStr
    password: str = Field(min_length=8)


class UsuarioRead(BaseModel):
    """Schema para leer datos del usuario."""
    id: int
    nombre: str
    apellido: str
    email: str
    celular: Optional[str] = None
    roles: List[str] = []
    created_at: str


class UsuarioUpdate(BaseModel):
    """Schema para actualizar usuario."""
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    celular: Optional[str] = None


class PasswordChange(BaseModel):
    """Schema para cambiar contraseña."""
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    """Respuesta de login/refresh con ambos tokens JWT."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    """Body para refresh y logout."""
    refresh_token: str
