from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timezone
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, Numeric
from app.core.types import PortableBigInt
from app.modules.productos.model import ProductoIngredienteLink

class IngredienteBase(SQLModel):
    nombre: str = Field(index=True, unique=True, max_length=100)
    descripcion: Optional[str] = None
    es_alergeno: bool = Field(default=False)
    stock_cantidad: Decimal = Field(default=Decimal("0"), ge=0, sa_type=Numeric(10, 3))
    unidad_medida_id: Optional[int] = Field(default=None, foreign_key="unidadmedida.id")

class Ingrediente(IngredienteBase, table=True):
    id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, primary_key=True, autoincrement=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None
    productos: List["Producto"] = Relationship(back_populates="ingredientes", link_model=ProductoIngredienteLink)
