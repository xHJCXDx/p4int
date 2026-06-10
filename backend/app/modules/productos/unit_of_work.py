from sqlmodel import Session
from app.core.unit_of_work import BaseUnitOfWork
from app.modules.productos.repository import ProductoRepository
from app.modules.ingredientes.repository import IngredienteRepository


class ProductoUnitOfWork(BaseUnitOfWork):
    """Unit of Work for Producto domain"""

    def __init__(self, session: Session):
        super().__init__(session)
        self.productos = ProductoRepository(session)
        self.ingredientes = IngredienteRepository(session)
