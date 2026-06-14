from typing import List, Optional
from sqlmodel import Session, select
from app.core.repository import BaseRepository
from app.modules.catalogo.model import FormaPago, EstadoPedido, UnidadMedida


class UnidadMedidaRepository(BaseRepository[UnidadMedida]):

    def __init__(self, session: Session):
        super().__init__(session, UnidadMedida)

    def get_all_simple(self) -> List[UnidadMedida]:
        statement = select(self.model)
        return list(self.session.exec(statement).all())

    def get_by_id(self, id: int) -> Optional[UnidadMedida]:
        return self.session.get(UnidadMedida, id)

    def get_by_codigo(self, codigo: str) -> Optional[UnidadMedida]:
        statement = select(UnidadMedida).where(UnidadMedida.codigo == codigo)
        return self.session.exec(statement).first()

    def is_in_use(self, id: int) -> bool:
        """Verifica si la unidad de medida está siendo usada por algún ingrediente."""
        from app.modules.ingredientes.model import Ingrediente
        result = self.session.exec(
            select(Ingrediente).where(Ingrediente.unidad_medida_id == id)
        ).first()
        return result is not None


class FormaPagoRepository(BaseRepository[FormaPago]):

    def __init__(self, session: Session):
        super().__init__(session, FormaPago)

    def get_by_id(self, codigo: str) -> Optional[FormaPago]:
        return self.session.get(FormaPago, codigo)


class EstadoPedidoRepository(BaseRepository[EstadoPedido]):

    def __init__(self, session: Session):
        super().__init__(session, EstadoPedido)

    def get_by_id(self, codigo: str) -> Optional[EstadoPedido]:
        return self.session.get(EstadoPedido, codigo)
