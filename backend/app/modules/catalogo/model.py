from typing import Optional
from sqlmodel import Field, SQLModel


class UnidadMedidaBase(SQLModel):
    nombre: str = Field(max_length=50)


class UnidadMedida(UnidadMedidaBase, table=True):
    codigo: str = Field(primary_key=True, max_length=10)


class FormaPagoBase(SQLModel):
    descripcion: str = Field(max_length=80)
    habilitado: bool = Field(default=True)

class FormaPago(FormaPagoBase, table=True):
    codigo: str = Field(primary_key=True, max_length=20)

class EstadoPedidoBase(SQLModel):
    descripcion: str = Field(max_length=80)
    orden: int = Field(ge=1)
    es_terminal: bool = Field(default=False)

class EstadoPedido(EstadoPedidoBase, table=True):
    codigo: str = Field(primary_key=True, max_length=20)
