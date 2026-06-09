from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.venta.repository import (
    PedidoRepository,
    DetallePedidoRepository,
    PagoRepository,
    HistorialEstadoPedidoRepository
)
from app.modules.producto.repository import ProductoRepository
from app.modules.ingrediente.repository import IngredienteRepository


class VentaUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Venta domain (Pedidos, Detalles, Pagos, Historial)"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.pedidos = PedidoRepository(session)
        self.detalles = DetallePedidoRepository(session)
        self.pagos = PagoRepository(session)
        self.historial = HistorialEstadoPedidoRepository(session)
        self.productos = ProductoRepository(session)
        self.ingredientes = IngredienteRepository(session)
