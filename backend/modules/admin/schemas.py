from datetime import datetime
from typing import List, Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel

from backend.modules.auth.models import Rol


# ── Lectura ───────────────────────────────────────────────────────────────────

class UsuarioAdminRead(SQLModel):
    id: int
    nombre: str
    email: str
    rol: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UsuarioAdminPaginatedResponse(SQLModel):
    total: int
    items: List[UsuarioAdminRead]


# ── Actualización ──────────────────────────────────────────────────────────────

class UsuarioAdminUpdate(SQLModel):
    """Actualización de datos básicos del usuario (no incluye rol ni password)."""
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=120)
    is_active: Optional[bool] = Field(default=None)


class RolAssignRequest(SQLModel):
    """Asignación de rol. Valida contra los roles permitidos del sistema."""
    rol: str = Field(min_length=1, max_length=20)

    @field_validator("rol")
    @classmethod
    def rol_valido(cls, value: str) -> str:
        value = value.strip().upper()
        if value not in Rol.values():
            permitidos = ", ".join(sorted(Rol.values()))
            raise ValueError(f"Rol inválido. Valores permitidos: {permitidos}")
        return value
