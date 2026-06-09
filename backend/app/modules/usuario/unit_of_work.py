"""Unit of Work para Usuario."""

from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.usuario.repository import UsuarioRepository


class UsuarioUnitOfWork(BaseUnitOfWork):
    """Unit of Work para Usuario."""

    def __init__(self, session: Session):
        super().__init__(session)
        self.usuarios = UsuarioRepository(session)
