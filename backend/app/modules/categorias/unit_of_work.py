from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.categorias.repository import CategoriaRepository


class CategoriaUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Categoria domain"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.categorias = CategoriaRepository(session)
