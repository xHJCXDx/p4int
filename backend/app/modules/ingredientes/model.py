from typing import List, Optional
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel
from app.modules.productos.model import ProductoIngredienteLink

class IngredienteBase(SQLModel):
    nombre: str = Field(index=True, unique=True, max_length=100)
    descripcion: Optional[str] = None
    es_alergeno: bool = Field(default=False)
    stock: int = Field(default=0, ge=0)
    unidad_medida_codigo: str = Field(default="u", foreign_key="unidadmedida.codigo", max_length=10)

class Ingrediente(IngredienteBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    productos: List["Producto"] = Relationship(back_populates="ingredientes", link_model=ProductoIngredienteLink)
