from typing import Optional
from app.modules.catalogo.model import FormaPagoBase, EstadoPedidoBase, UnidadMedidaBase

class FormaPagoRead(FormaPagoBase):
    codigo: str

class EstadoPedidoRead(EstadoPedidoBase):
    codigo: str

class UnidadMedidaCreate(UnidadMedidaBase):
    codigo: str

class UnidadMedidaRead(UnidadMedidaBase):
    id: int
    codigo: str
