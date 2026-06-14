from typing import List, Optional
from datetime import datetime, timezone
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, ForeignKey, Integer
from app.core.types import PortableBigInt
from app.modules.productos.model import ProductoCategoriaLink

class CategoriaBase(SQLModel):
    nombre: str = Field(index=True, unique=True, max_length=100)
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None

class Categoria(CategoriaBase, table=True):
    id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, primary_key=True, autoincrement=True))
    parent_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("categoria.id", ondelete="SET NULL"), nullable=True),
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None
    productos: List["Producto"] = Relationship(back_populates="categorias", link_model=ProductoCategoriaLink)
    subcategorias: List["Categoria"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"remote_side": "Categoria.id", "foreign_keys": "[Categoria.parent_id]"}
    )
    parent: Optional["Categoria"] = Relationship(back_populates="subcategorias")
