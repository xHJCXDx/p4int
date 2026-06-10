"""Unit of Work para DireccionEntrega."""

from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.direcciones.repository import DireccionEntregaRepository


class DireccionEntregaUnitOfWork(BaseUnitOfWork):
    """Unit of Work para DireccionEntrega."""

    def __init__(self, session: Session):
        super().__init__(session)
        self.direcciones = DireccionEntregaRepository(session)
