"""Schemas para DireccionEntrega."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class DireccionCreate(BaseModel):
    alias: str
    calle: str
    numero: str
    localidad: str
    provincia: str
    codigo_postal: str
    piso: Optional[str] = None
    departamento: Optional[str] = None
    referencia: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: Optional[bool] = False


class DireccionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    usuario_id: int
    alias: str
    calle: str
    numero: str
    localidad: str
    provincia: str
    codigo_postal: str
    piso: Optional[str] = None
    departamento: Optional[str] = None
    referencia: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: bool
    created_at: datetime


class DireccionUpdate(BaseModel):
    alias: Optional[str] = None
    calle: Optional[str] = None
    numero: Optional[str] = None
    localidad: Optional[str] = None
    provincia: Optional[str] = None
    codigo_postal: Optional[str] = None
    piso: Optional[str] = None
    departamento: Optional[str] = None
    referencia: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: Optional[bool] = None
