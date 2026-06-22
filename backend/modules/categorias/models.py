from typing import List, Optional, TYPE_CHECKING
from datetime import datetime

from sqlmodel import Field, Relationship, SQLModel
from backend.core.links import ProductoCategoriaLink

# Evita importación circular
if TYPE_CHECKING:
    from backend.modules.productos.models import Producto

class Categoria(SQLModel, table=True):
    """
    Entidad Categoría con 2 tipos de relación:

    1:N parent_id -> Una categoría puede tener sub-categorías
    N:M productos -> Varias categorías pueden tener varios productos
    """

    # Nombre de la tabla
    __tablename__ = "categoria"

    # PK
    id: Optional[int] = Field(default=None, primary_key=True)

    # FK Auto-Referencia (Padre)
    parent_id: Optional[int] = Field(default=None, foreign_key="categoria.id", nullable=True)

    # Atributos de la clase
    nombre: str = Field(max_length=100, unique=True, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    imagen_url: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)

    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)

    # Relaciones

    # Relación auto-referencia: Relación hacia el padre
    parent: Optional["Categoria"] = Relationship(back_populates="subcategorias", sa_relationship_kwargs={"remote_side":"Categoria.id"})

    # Relación auto-referencia: Relación hacia los hijos
    subcategorias: List["Categoria"] = Relationship(back_populates="parent")

    # Relación N:M con producto
    productos: List["Producto"] = Relationship(back_populates="categorias", link_model=ProductoCategoriaLink)

