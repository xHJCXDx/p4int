from typing import Optional
from app.modules.catalogo.model import FormaPagoBase, EstadoPedidoBase, UnidadMedidaBase

class FormaPagoCreate(FormaPagoBase):
    codigo: str

class FormaPagoRead(FormaPagoBase):
    codigo: str

class EstadoPedidoCreate(EstadoPedidoBase):
    codigo: str

class EstadoPedidoRead(EstadoPedidoBase):
    codigo: str

class UnidadMedidaCreate(UnidadMedidaBase):
    codigo: str

class UnidadMedidaRead(UnidadMedidaBase):
    codigo: str
