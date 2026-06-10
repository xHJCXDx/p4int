from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.ingredientes.repository import IngredienteRepository


class IngredienteUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Ingrediente domain"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.ingredientes = IngredienteRepository(session)
