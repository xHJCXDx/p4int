from typing import Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import Column
from app.core.types import PortableBigInt


class UnidadMedidaBase(SQLModel):
    codigo: str = Field(unique=True, max_length=10)
    nombre: str = Field(unique=True, max_length=50)
    simbolo: str = Field(unique=True, max_length=10)
    tipo: str = Field(max_length=20)


class UnidadMedida(UnidadMedidaBase, table=True):
    id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, primary_key=True, autoincrement=True))


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
