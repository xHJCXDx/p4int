from typing import Optional, List

from sqlmodel import Field, SQLModel


class IngredienteBase(SQLModel):
    nombre: str = Field(min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)
    es_alergeno: bool = False
    unidad_medida: str = Field(default="ud", min_length=1, max_length=20)
    unidad_medida_id: Optional[int] = Field(default=None, ge=1)
    stock_cantidad: int = Field(default=0, ge=0)


class IngredienteCreate(IngredienteBase):
    pass


class IngredienteUpdate(SQLModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)
    es_alergeno: Optional[bool] = None
    unidad_medida: Optional[str] = Field(default=None, min_length=1, max_length=20)
    unidad_medida_id: Optional[int] = Field(default=None, ge=1)
    stock_cantidad: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


class IngredienteRead(IngredienteBase):
    id: int
    is_active: bool = True


class IngredienteBasicRead(SQLModel):
    id: int
    nombre: str
    es_alergeno: bool
    unidad_medida: str
    unidad_medida_id: Optional[int] = None
    stock_cantidad: int

#Paginado
class IngredientePaginatedResponse(SQLModel):
    total: int
    items: List[IngredienteRead]


class IngredienteEstadoUpdate(SQLModel):
    is_active: bool
