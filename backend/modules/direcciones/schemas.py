from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


class DireccionEntregaBase(SQLModel):
    alias: Optional[str] = Field(default=None, max_length=50)
    linea1: str = Field(min_length=2)
    linea2: Optional[str] = Field(default=None)
    ciudad: str = Field(min_length=2, max_length=100)
    provincia: Optional[str] = Field(default=None, max_length=100)
    codigo_postal: Optional[str] = Field(default=None, max_length=10)
    latitud: Optional[Decimal] = Field(default=None, max_digits=9, decimal_places=6)
    longitud: Optional[Decimal] = Field(default=None, max_digits=9, decimal_places=6)


class DireccionEntregaCreate(DireccionEntregaBase):
    pass


class DireccionEntregaUpdate(SQLModel):
    alias: Optional[str] = Field(default=None, max_length=50)
    linea1: Optional[str] = Field(default=None, min_length=2)
    linea2: Optional[str] = Field(default=None)
    ciudad: Optional[str] = Field(default=None, min_length=2, max_length=100)
    provincia: Optional[str] = Field(default=None, max_length=100)
    codigo_postal: Optional[str] = Field(default=None, max_length=10)
    latitud: Optional[Decimal] = Field(default=None, max_digits=9, decimal_places=6)
    longitud: Optional[Decimal] = Field(default=None, max_digits=9, decimal_places=6)


class DireccionEntregaRead(DireccionEntregaBase):
    id: int
    usuario_id: int
    es_principal: bool
    created_at: datetime
    updated_at: datetime
