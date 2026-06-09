"""Schemas para DireccionEntrega."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class DireccionCreate(BaseModel):
    alias: str
    linea1: str
    linea2: Optional[str] = None
    ciudad: str
    provincia: str
    codigo_postal: str
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: Optional[bool] = False


class DireccionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    usuario_id: int
    alias: str
    linea1: str
    linea2: Optional[str] = None
    ciudad: str
    provincia: str
    codigo_postal: str
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: bool
    created_at: datetime


class DireccionUpdate(BaseModel):
    alias: Optional[str] = None
    linea1: Optional[str] = None
    linea2: Optional[str] = None
    ciudad: Optional[str] = None
    provincia: Optional[str] = None
    codigo_postal: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: Optional[bool] = None
