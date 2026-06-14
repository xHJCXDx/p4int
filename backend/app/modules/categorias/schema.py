from typing import List, Optional
from datetime import datetime
from app.modules.categorias.model import CategoriaBase

class CategoriaCreate(CategoriaBase):
    parent_id: Optional[int] = None

class CategoriaRead(CategoriaBase):
    id: int
    parent_id: Optional[int] = None
    parent_nombre: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

class CategoriaUpdate(CategoriaBase):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    parent_id: Optional[int] = None

class CategoriaWithChildren(CategoriaBase):
    """Response schema for GET /categorias/{id} — includes direct children."""
    id: int
    parent_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    children: List[CategoriaRead] = []
