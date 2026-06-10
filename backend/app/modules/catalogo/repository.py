from typing import List, Optional, Tuple
from sqlmodel import Session, select
from app.core.repository import BaseRepository
from app.modules.catalogo.model import FormaPago, EstadoPedido, UnidadMedida


class UnidadMedidaRepository(BaseRepository[UnidadMedida]):

    def __init__(self, session: Session):
        super().__init__(session, UnidadMedida)

    def get_all_simple(self) -> List[UnidadMedida]:
        statement = select(self.model)
        return list(self.session.exec(statement).all())

    def get_by_id(self, codigo: str) -> Optional[UnidadMedida]:
        return self.session.get(UnidadMedida, codigo)

    def is_in_use(self, codigo: str) -> bool:
        """Verifica si la unidad de medida está siendo usada por algún ingrediente."""
        from app.modules.ingredientes.model import Ingrediente
        result = self.session.exec(
            select(Ingrediente).where(Ingrediente.unidad_medida_codigo == codigo)
        ).first()
        return result is not None


class FormaPagoRepository(BaseRepository[FormaPago]):
    """Repository for FormaPago entity"""

    def __init__(self, session: Session):
        super().__init__(session, FormaPago)

    def get_all(self, limit: int = 100, offset: int = 0) -> Tuple[List[FormaPago], int]:
        """Get all formas de pago with pagination"""
        return super().get_all(limit, offset)

    def get_by_id(self, codigo: str) -> Optional[FormaPago]:
        """Get forma de pago by codigo (primary key)"""
        return self.session.get(FormaPago, codigo)

    def flush(self) -> None:
        """Flush without committing"""
        self.session.flush()


class EstadoPedidoRepository(BaseRepository[EstadoPedido]):
    """Repository for EstadoPedido entity"""

    def __init__(self, session: Session):
        super().__init__(session, EstadoPedido)

    def get_all(self, limit: int = 100, offset: int = 0) -> Tuple[List[EstadoPedido], int]:
        """Get all estados de pedido with pagination"""
        return super().get_all(limit, offset)

    def get_by_id(self, codigo: str) -> Optional[EstadoPedido]:
        """Get estado de pedido by codigo (primary key)"""
        return self.session.get(EstadoPedido, codigo)

    def flush(self) -> None:
        """Flush without committing"""
        self.session.flush()
