from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Column, JSON
from sqlmodel import Field, Relationship, SQLModel, CheckConstraint
from backend.core.links import ProductoCategoriaLink, ProductoIngredienteLink

# Evita importación circular
if TYPE_CHECKING:
    from backend.modules.categorias.models import Categoria
    from backend.modules.ingredientes.models import Ingrediente


class Producto(SQLModel, table=True):
    """
    Entidad Producto con 1 relación:

    N:M categoria -> Varios productos pueden tener varias categorias
    N:M ingrediente -> Varios productos pueden tener varios ingredientes
    """

    # Nombre de la tabla
    __tablename__ = "producto"

    # PK
    id: Optional[int] = Field(default=None, primary_key=True)

    # Atributos de la clase
    nombre: str = Field(max_length=150, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    precio_base: Decimal = Field(default=0, max_digits=10, decimal_places=2, sa_column_kwargs={"server_default":"0"})
    imagenes_url: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    unidad_venta_id: Optional[int] = Field(default=None, foreign_key="unidad_medida.id")
    stock_cantidad: int = Field(default=0, sa_column_kwargs={"server_default": "0"})
    disponible: bool = Field(default=True)
    is_active: bool = Field(default=True)

    # Para el check >= 0 a nivel de base de datos
    __table_args__ = (
        CheckConstraint("precio_base >= 0", name="check_precio_base_positive"),
        CheckConstraint("stock_cantidad >= 0", name="check_stock_cantidad_positive"),
        )

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relaciones

    # Relación N:M con Categoría
    categorias: List["Categoria"] = Relationship(back_populates="productos", link_model=ProductoCategoriaLink)

    # Relación N:M con Ingrediente
    ingredientes: List["Ingrediente"] = Relationship(back_populates="productos", link_model=ProductoIngredienteLink)

