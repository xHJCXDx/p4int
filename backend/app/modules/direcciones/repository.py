"""Repository para DireccionEntrega."""

from typing import List, Optional
from datetime import datetime, timezone
from sqlmodel import Session, select, func
from app.core.repository import BaseRepository
from app.modules.direcciones.model import DireccionEntrega


class DireccionEntregaRepository(BaseRepository[DireccionEntrega]):
    """Repository especializado para DireccionEntrega con soft delete."""

    def __init__(self, session: Session):
        super().__init__(session, DireccionEntrega)

    def get_by_id(self, direccion_id: int) -> Optional[DireccionEntrega]:
        """Obtiene dirección por ID (excluye eliminadas)."""
        direccion = self.session.get(DireccionEntrega, direccion_id)
        if direccion and direccion.deleted_at is not None:
            return None
        return direccion

    def get_by_usuario(self, usuario_id: int, limit: int = 100, offset: int = 0) -> tuple[List[DireccionEntrega], int]:
        """Obtiene direcciones de un usuario (excluye eliminadas)."""
        statement = select(self.model).where(
            (self.model.usuario_id == usuario_id) & (self.model.deleted_at.is_(None))
        ).offset(offset).limit(limit)
        items = self.session.exec(statement).all()

        count_statement = select(func.count(self.model.id)).where(
            (self.model.usuario_id == usuario_id) & (self.model.deleted_at.is_(None))
        )
        total = self.session.exec(count_statement).one()

        return items, total

    def get_principal(self, usuario_id: int) -> Optional[DireccionEntrega]:
        """Obtiene la dirección principal del usuario (excluye eliminadas)."""
        statement = select(self.model).where(
            (self.model.usuario_id == usuario_id) & (self.model.es_principal == True) & (self.model.deleted_at.is_(None))
        )
        return self.session.exec(statement).first()

    def soft_delete(self, db_direccion: DireccionEntrega) -> None:
        """Soft delete de una dirección."""
        super().soft_delete(db_direccion)
