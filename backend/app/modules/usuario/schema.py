"""Schemas Pydantic para Usuario."""

from typing import Optional, List
from pydantic import BaseModel, EmailStr


class RolRead(BaseModel):
    """Schema para leer un Rol."""
    codigo: str
    nombre: str
    descripcion: str


class UsuarioCreate(BaseModel):
    """Schema para crear un nuevo usuario."""
    nombre: str
    apellido: str
    email: EmailStr
    password: str
    celular: Optional[str] = None


class UsuarioLogin(BaseModel):
    """Schema para login."""
    email: EmailStr
    password: str


class UsuarioRead(BaseModel):
    """Schema para leer datos del usuario."""
    id: int
    nombre: str
    apellido: str
    email: str
    celular: Optional[str] = None
    roles: List[RolRead] = []
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
