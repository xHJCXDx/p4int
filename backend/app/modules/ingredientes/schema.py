from typing import Optional
from decimal import Decimal
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
    stock_cantidad: Optional[Decimal] = None
    unidad_medida_id: Optional[int] = None
