from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from sqlmodel import SQLModel
from app.modules.productos.model import ProductoBase


class IngredienteEnReceta(SQLModel):
    ingrediente_id: int
    cantidad: Decimal = Decimal("1")
    unidad_medida_codigo: str = "u"
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
    cantidad: Decimal
    unidad_medida_codigo: str
    es_removible: bool


class ProductoRead(ProductoBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    categorias: List[CategoriaInProducto] = []
    ingredientes: List[IngredienteInProducto] = []


class ProductoUpdate(ProductoBase):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    imagenes_url: Optional[List[str]] = None
    unidad_venta_codigo: Optional[str] = None
    stock: Optional[int] = None
    disponible: Optional[bool] = None
    categoria_ids: Optional[List[int]] = None
    ingredientes: Optional[List[IngredienteEnReceta]] = None


class DisponibilidadUpdate(SQLModel):
    disponible: bool


class ImagenesUpdate(SQLModel):
    imagenes_url: List[str]
