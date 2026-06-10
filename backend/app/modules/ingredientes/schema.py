from typing import Optional
from datetime import datetime
from app.modules.ingredientes.model import IngredienteBase

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
    stock: Optional[int] = None
    unidad_medida_codigo: Optional[str] = None
