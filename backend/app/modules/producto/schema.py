from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel
from app.modules.producto.model import ProductoBase


class IngredienteEnReceta(SQLModel):
    ingrediente_id: int
    cantidad: int = 1
    es_removible: bool = False


class ProductoCreate(ProductoBase):
    categoria_ids: List[int] = []
    ingredientes: List[IngredienteEnReceta] = []


class CategoriaInProducto(SQLModel):
    id: int
    nombre: str


class IngredienteInProducto(SQLModel):
    id: int
    nombre: str
    es_alergeno: bool
    cantidad: int
    es_removible: bool


class ProductoRead(ProductoBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    categorias: List[CategoriaInProducto] = []
    ingredientes: List[IngredienteInProducto] = []
    stock_cantidad: int = 0
    disponible: bool = False


class ProductoUpdate(ProductoBase):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio_base: Optional[float] = None
    imagenes_url: Optional[List[str]] = None
    categoria_ids: Optional[List[int]] = None
    ingredientes: Optional[List[IngredienteEnReceta]] = None
