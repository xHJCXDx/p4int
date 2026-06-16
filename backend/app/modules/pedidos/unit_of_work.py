from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.pedidos.repository import (
    PedidoRepository,
    DetallePedidoRepository,
    HistorialEstadoPedidoRepository
)
from app.modules.productos.repository import ProductoRepository
from app.modules.ingredientes.repository import IngredienteRepository
from app.modules.catalogo.repository import UnidadMedidaRepository


class PedidoUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Pedido domain (Pedidos, Detalles, Historial)"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.pedidos = PedidoRepository(session)
        self.detalles = DetallePedidoRepository(session)
        self.historial = HistorialEstadoPedidoRepository(session)
        self.productos = ProductoRepository(session)
        self.ingredientes = IngredienteRepository(session)
        self.unidades_medida = UnidadMedidaRepository(session)
