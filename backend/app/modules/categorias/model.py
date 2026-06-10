from typing import List, Optional
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel
from app.modules.productos.model import ProductoCategoriaLink

class CategoriaBase(SQLModel):
    nombre: str = Field(index=True, unique=True, max_length=100)
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None

class Categoria(CategoriaBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="categoria.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    productos: List["Producto"] = Relationship(back_populates="categorias", link_model=ProductoCategoriaLink)
    subcategorias: List["Categoria"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"remote_side": "Categoria.id", "foreign_keys": "[Categoria.parent_id]"}
    )
    parent: Optional["Categoria"] = Relationship(back_populates="subcategorias")
