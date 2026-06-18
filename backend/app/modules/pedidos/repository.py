from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload
from app.core.repository import BaseRepository
from app.modules.pedidos.model import Pedido, DetallePedido, HistorialEstadoPedido


class PedidoRepository(BaseRepository[Pedido]):
    """Repository for Pedido entity with soft delete support"""

    def __init__(self, session: Session):
        super().__init__(session, Pedido)

    def list_all(self, skip: int = 0, limit: int = 100) -> Tuple[List[Pedido], int]:
        """Get all pedidos (excluding soft-deleted) with pagination"""
        statement = (
            select(Pedido)
            .where(Pedido.deleted_at.is_(None))
            .options(selectinload(Pedido.detalles))
            .offset(skip).limit(limit)
        )
        items = self.session.exec(statement).unique().all()

        count_statement = select(func.count(Pedido.id)).where(Pedido.deleted_at.is_(None))
        total = self.session.exec(count_statement).one()

        return items, total

    def get_all_for_user(self, usuario_id: int, limit: int = 100, offset: int = 0) -> Tuple[List[Pedido], int]:
        """Get all pedidos for a specific user (CLIENT only sees their own)"""
        statement = (
            select(Pedido)
            .where((Pedido.deleted_at.is_(None)) & (Pedido.usuario_id == usuario_id))
            .options(selectinload(Pedido.detalles))
            .offset(offset).limit(limit)
        )
        items = self.session.exec(statement).unique().all()

        count_statement = select(func.count(Pedido.id)).where(
            (Pedido.deleted_at.is_(None)) & (Pedido.usuario_id == usuario_id)
        )
        total = self.session.exec(count_statement).one()

        return items, total

    def get_by_id(self, pedido_id: int) -> Optional[Pedido]:
        """Get pedido by ID (returns None if soft-deleted)"""
        statement = (
            select(Pedido)
            .where(Pedido.id == pedido_id, Pedido.deleted_at.is_(None))
            .options(selectinload(Pedido.detalles))
        )
        return self.session.exec(statement).first()

    def update(self, db_pedido: Pedido, pedido_data: dict) -> Pedido:
        """Update a pedido con timestamp automático."""
        pedido_data["updated_at"] = datetime.now(timezone.utc)
        return super().update(db_pedido, pedido_data)

    def soft_delete(self, db_pedido: Pedido) -> None:
        """Soft delete a pedido"""
        super().soft_delete(db_pedido)

    def update_estado(self, db_pedido: Pedido, nuevo_estado: str) -> Pedido:
        """Update pedido estado"""
        db_pedido.estado_codigo = nuevo_estado
        db_pedido.updated_at = datetime.now(timezone.utc)
        self.session.add(db_pedido)
        return db_pedido


class DetallePedidoRepository(BaseRepository[DetallePedido]):
    """Repository for DetallePedido entity (immutable snapshot — RN-04)"""

    def __init__(self, session: Session):
        super().__init__(session, DetallePedido)

    def get_by_pedido(self, pedido_id: int) -> List[DetallePedido]:
        """Get all detalles for a pedido"""
        statement = select(DetallePedido).where(DetallePedido.pedido_id == pedido_id)
        return self.session.exec(statement).all()

    def update(self, *args, **kwargs):
        """RN-04: DetallePedido es un snapshot inmutable, no se permite modificar."""
        raise NotImplementedError("DetallePedido es inmutable (RN-04): no se permite UPDATE")

    def hard_delete(self, *args, **kwargs):
        """RN-04: DetallePedido es un snapshot inmutable, no se permite eliminar."""
        raise NotImplementedError("DetallePedido es inmutable (RN-04): no se permite DELETE")


class HistorialEstadoPedidoRepository(BaseRepository[HistorialEstadoPedido]):
    """Repository for HistorialEstadoPedido entity (append-only audit trail — RN-03)"""

    def __init__(self, session: Session):
        super().__init__(session, HistorialEstadoPedido)

    def get_by_pedido(self, pedido_id: int) -> List[HistorialEstadoPedido]:
        """Get all historial entries for a pedido"""
        statement = (
            select(HistorialEstadoPedido)
            .where(HistorialEstadoPedido.pedido_id == pedido_id)
            .order_by(HistorialEstadoPedido.created_at.asc())
        )
        return self.session.exec(statement).all()

    def update(self, *args, **kwargs):
        """RN-03: El historial es append-only, no se permite modificar registros."""
        raise NotImplementedError("HistorialEstadoPedido es append-only (RN-03): no se permite UPDATE")

    def hard_delete(self, *args, **kwargs):
        """RN-03: El historial es append-only, no se permite eliminar registros."""
        raise NotImplementedError("HistorialEstadoPedido es append-only (RN-03): no se permite DELETE")
