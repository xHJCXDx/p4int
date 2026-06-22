from __future__ import annotations
from typing import Optional
from decimal import Decimal

from pydantic import model_validator
from sqlmodel import Field, SQLModel


class CategoriaBase(SQLModel):
    nombre: str = Field(min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)
    imagen_url: Optional[str] = Field(default=None, max_length=500)


class CategoriaParentRef(SQLModel):
    id: int = Field(ge=1)


class CategoriaCreate(CategoriaBase):
    parent_id: Optional[int] = Field(default=None, ge=1)
    parent: Optional[CategoriaParentRef] = None
    is_active: Optional[bool] = Field(default=True)

    @model_validator(mode="after")
    def normalize_parent(self) -> "CategoriaCreate":
        if self.parent_id is None and self.parent is not None:
            self.parent_id = self.parent.id
        return self


class CategoriaUpdate(SQLModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)
    imagen_url: Optional[str] = Field(default=None, max_length=500)
    parent_id: Optional[int] = Field(default=None, ge=1)
    parent: Optional[CategoriaParentRef] = None
    is_active: Optional[bool] = Field(default=True)

    @model_validator(mode="after")
    def normalize_parent(self) -> "CategoriaUpdate":
        if self.parent_id is None and self.parent is not None:
            self.parent_id = self.parent.id
        return self


class CategoriaRead(CategoriaBase):
    id: int
    parent_id: Optional[int] = None
    nombre: str
    is_active: bool = True


class CategoriaBasicRead(SQLModel):
    id: int
    nombre: str


class ProductoBasicRead(SQLModel):
    id: int
    nombre: str
    precio_base: Decimal


class CategoriaReadFull(CategoriaRead):
    parent: Optional[CategoriaBasicRead] = None
    subcategorias: list[CategoriaBasicRead] = Field(default_factory=list)
    productos: list[ProductoBasicRead] = Field(default_factory=list)


class CategoriaPaginatedResponse(SQLModel):
    total: int
    items: list[CategoriaReadFull]


class CategoriaEstadoUpdate(SQLModel):
    is_active: bool
