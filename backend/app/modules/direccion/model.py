"""Modelo de DireccionEntrega."""

from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel


class DireccionEntregaBase(SQLModel):
    usuario_id: int = Field(foreign_key="usuario.id")
    alias: str = Field(max_length=50)
    linea1: str = Field(max_length=200)
    linea2: Optional[str] = Field(default=None, max_length=200)
    ciudad: str = Field(max_length=100)
    provincia: str = Field(max_length=100)
    codigo_postal: str = Field(max_length=10)
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: bool = Field(default=False)


class DireccionEntrega(DireccionEntregaBase, table=True):
    """Dirección de entrega del usuario con soft delete."""
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
