from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.pagos.repository import PagoRepository
from app.modules.pedidos.repository import PedidoRepository


class PagoUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Pago domain"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.pagos = PagoRepository(session)
        self.pedidos = PedidoRepository(session)
