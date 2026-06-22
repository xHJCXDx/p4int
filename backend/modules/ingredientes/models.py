from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

from backend.core.links import ProductoIngredienteLink

if TYPE_CHECKING:
    from backend.modules.productos.models import Producto


class UnidadMedida(SQLModel, table=True):
    __tablename__ = "unidad_medida"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=50, unique=True, nullable=False)
    simbolo: str = Field(max_length=10, unique=True, nullable=False)
    tipo: str = Field(max_length=20, nullable=False)


class Ingrediente(SQLModel, table=True):
    __tablename__ = "ingrediente"

    id: Optional[int] = Field(default=None, primary_key=True)

    nombre: str = Field(max_length=100, unique=True, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    es_alergeno: bool = Field(default=False, nullable=False)
    unidad_medida_id: Optional[int] = Field(default=None, foreign_key="unidad_medida.id", nullable=False)
    stock_cantidad: int = Field(default=0, ge=0, nullable=False)
    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)

    productos: List["Producto"] = Relationship(
        back_populates="ingredientes",
        link_model=ProductoIngredienteLink,
    )
    unidad: Optional[UnidadMedida] = Relationship()
