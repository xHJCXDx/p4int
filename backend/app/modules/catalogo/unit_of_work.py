from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.catalogo.repository import FormaPagoRepository, EstadoPedidoRepository, UnidadMedidaRepository


class CatalogoUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Catalogo domain"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.formas_pago = FormaPagoRepository(session)
        self.estados_pedido = EstadoPedidoRepository(session)
        self.unidades_medida = UnidadMedidaRepository(session)
