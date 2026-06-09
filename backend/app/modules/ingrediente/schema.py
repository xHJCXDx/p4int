from typing import Optional
from datetime import datetime
from app.modules.ingrediente.model import IngredienteBase

class IngredienteCreate(IngredienteBase):
    pass

class IngredienteRead(IngredienteBase):
    id: int
    created_at: datetime
    updated_at: datetime

class IngredienteUpdate(IngredienteBase):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    es_alergeno: Optional[bool] = None
    stock_cantidad: Optional[int] = None
    unidad_medida_codigo: Optional[str] = None
