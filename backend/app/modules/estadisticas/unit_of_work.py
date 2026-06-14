from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.estadisticas.repository import EstadisticasRepository


class EstadisticasUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Estadisticas domain (read-only queries)"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.estadisticas = EstadisticasRepository(session)
