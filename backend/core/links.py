from datetime import datetime
from decimal import Decimal

from sqlmodel import Field, SQLModel

# Tablas intermedias (Link Models)
class ProductoCategoriaLink(SQLModel, table=True):
    # Nombre de la tabla
    __tablename__ = "producto_categoria"

    producto_id: int = Field(foreign_key="producto.id", primary_key=True)
    categoria_id: int = Field(foreign_key="categoria.id", primary_key=True)

    # Atributos adicionales
    es_principal: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

class ProductoIngredienteLink(SQLModel, table=True):
    # Nombre de la tabla
    __tablename__ = "producto_ingrediente"

    producto_id: int = Field(foreign_key="producto.id", primary_key=True)
    ingrediente_id: int = Field(foreign_key="ingrediente.id", primary_key=True)

    # Atributos adicionales
    es_removible: bool = Field(default=False, nullable=False)
    cantidad: Decimal = Field(default=Decimal("1"), gt=0, max_digits=10, decimal_places=3, nullable=False)
    unidad_medida_id: int | None = Field(default=None, foreign_key="unidad_medida.id", nullable=False)


ProductoIngredienteCantidadLink = ProductoIngredienteLink
