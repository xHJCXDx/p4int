"""Modelo de DireccionEntrega."""

from typing import Optional
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, Index
from app.core.types import PortableBigInt


class DireccionEntregaBase(SQLModel):
    usuario_id: int = Field(foreign_key="usuario.id")
    alias: Optional[str] = Field(default=None, max_length=50)
    calle: str = Field(max_length=200)
    numero: str = Field(max_length=20)
    localidad: str = Field(max_length=100)
    provincia: str = Field(max_length=100)
    codigo_postal: str = Field(max_length=10)
    piso: Optional[str] = Field(default=None, max_length=10)
    departamento: Optional[str] = Field(default=None, max_length=10)
    referencia: Optional[str] = Field(default=None, max_length=200)
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: bool = Field(default=False)


class DireccionEntrega(DireccionEntregaBase, table=True):
    """Dirección de entrega del usuario con soft delete."""
    id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, primary_key=True, autoincrement=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

    __table_args__ = (
        Index(
            "uq_direccion_principal_por_usuario",
            "usuario_id",
            unique=True,
            postgresql_where="es_principal = TRUE",
        ),
    )
