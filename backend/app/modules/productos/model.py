from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timezone
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, Numeric, Text
from app.core.types import PortableArray, PortableBigInt

class ProductoCategoriaLink(SQLModel, table=True):
    producto_id: Optional[int] = Field(default=None, foreign_key="producto.id", primary_key=True)
    categoria_id: Optional[int] = Field(default=None, foreign_key="categoria.id", primary_key=True)
    es_principal: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductoIngredienteLink(SQLModel, table=True):
    producto_id: Optional[int] = Field(default=None, foreign_key="producto.id", primary_key=True)
    ingrediente_id: Optional[int] = Field(default=None, foreign_key="ingrediente.id", primary_key=True)
    cantidad: Decimal = Field(default=Decimal("1"), sa_type=Numeric(10, 3), gt=0)
    unidad_medida_id: int = Field(foreign_key="unidadmedida.id")
    es_removible: bool = Field(default=False)

class ProductoBase(SQLModel):
    nombre: str = Field(index=True, max_length=150)
    descripcion: Optional[str] = None
    precio_base: Decimal = Field(sa_type=Numeric(10, 2), ge=0)
    imagenes_url: Optional[List[str]] = Field(default=None, sa_type=PortableArray(Text))
    unidad_venta_id: Optional[int] = Field(default=None, foreign_key="unidadmedida.id")
    stock_cantidad: int = Field(default=0, ge=0)
    disponible: bool = Field(default=True)

class Producto(ProductoBase, table=True):
    id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, primary_key=True, autoincrement=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None
    categorias: List["Categoria"] = Relationship(back_populates="productos", link_model=ProductoCategoriaLink)
    ingredientes: List["Ingrediente"] = Relationship(back_populates="productos", link_model=ProductoIngredienteLink)
