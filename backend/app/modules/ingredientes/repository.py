from typing import List, Optional, Tuple
from datetime import datetime
from sqlmodel import Session, select, func
from app.core.repository import BaseRepository
from app.modules.ingredientes.model import Ingrediente


class IngredienteRepository(BaseRepository[Ingrediente]):
    """Repository for Ingrediente entity with soft delete support"""

    def __init__(self, session: Session):
        super().__init__(session, Ingrediente)

    def get_all(self, limit: int = 100, offset: int = 0) -> Tuple[List[Ingrediente], int]:
        """Get all ingredientes (excluding soft-deleted) with pagination"""
        statement = select(Ingrediente).where(Ingrediente.deleted_at.is_(None)).offset(offset).limit(limit)
        items = self.session.exec(statement).all()

        count_statement = select(func.count(Ingrediente.id)).where(Ingrediente.deleted_at.is_(None))
        total = self.session.exec(count_statement).one()

        return items, total

    def get_by_nombre(self, nombre: str) -> Optional[Ingrediente]:
        """Obtiene un ingrediente por nombre."""
        statement = select(Ingrediente).where(Ingrediente.nombre == nombre)
        return self.session.exec(statement).first()

    def get_by_id(self, ingrediente_id: int) -> Optional[Ingrediente]:
        """Get ingrediente by ID (returns None if soft-deleted)"""
        ingrediente = self.session.get(Ingrediente, ingrediente_id)
        if ingrediente and ingrediente.deleted_at is not None:
            return None
        return ingrediente

    def delete(self, db_ingrediente: Ingrediente) -> None:
        """Soft delete an ingrediente"""
        db_ingrediente.deleted_at = datetime.utcnow()
        self.session.add(db_ingrediente)
