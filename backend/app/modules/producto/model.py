from typing import List, Optional
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel, JSON

class ProductoCategoriaLink(SQLModel, table=True):
    producto_id: Optional[int] = Field(default=None, foreign_key="producto.id", primary_key=True)
    categoria_id: Optional[int] = Field(default=None, foreign_key="categoria.id", primary_key=True)
    es_principal: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProductoIngredienteLink(SQLModel, table=True):
    producto_id: Optional[int] = Field(default=None, foreign_key="producto.id", primary_key=True)
    ingrediente_id: Optional[int] = Field(default=None, foreign_key="ingrediente.id", primary_key=True)
    cantidad: int = Field(default=1, ge=1)
    es_removible: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProductoBase(SQLModel):
    nombre: str = Field(index=True, max_length=150)
    descripcion: Optional[str] = None
    precio_base: float
    imagenes_url: List[str] = Field(default=[], sa_type=JSON)

class Producto(ProductoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    categorias: List["Categoria"] = Relationship(back_populates="productos", link_model=ProductoCategoriaLink)
    ingredientes: List["Ingrediente"] = Relationship(back_populates="productos", link_model=ProductoIngredienteLink)
