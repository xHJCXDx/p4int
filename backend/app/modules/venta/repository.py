from typing import List, Optional, Tuple
from datetime import datetime
from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload
from app.core.repository import BaseRepository
from app.modules.venta.model import Pedido, DetallePedido, Pago, HistorialEstadoPedido


class PedidoRepository(BaseRepository[Pedido]):
    """Repository for Pedido entity with soft delete support"""

    def __init__(self, session: Session):
        super().__init__(session, Pedido)

    def get_all(self, limit: int = 100, offset: int = 0) -> Tuple[List[Pedido], int]:
        """Get all pedidos (excluding soft-deleted) with pagination"""
        statement = (
            select(Pedido)
            .where(Pedido.deleted_at.is_(None))
            .options(selectinload(Pedido.detalles))
            .offset(offset).limit(limit)
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
        pedido = self.session.get(Pedido, pedido_id)
        if pedido and pedido.deleted_at is not None:
            return None
        return pedido

    def create(self, pedido: Pedido) -> Pedido:
        """Create a new pedido"""
        return super().create(pedido)

    def update(self, db_pedido: Pedido, pedido_data: dict) -> Pedido:
        """Update a pedido"""
        pedido_data["updated_at"] = datetime.utcnow()
        return super().update(db_pedido, pedido_data)

    def delete(self, db_pedido: Pedido) -> None:
        """Soft delete a pedido"""
        db_pedido.deleted_at = datetime.utcnow()
        self.session.add(db_pedido)

    def update_estado(self, db_pedido: Pedido, nuevo_estado: str) -> Pedido:
        """Update pedido estado"""
        db_pedido.estado_codigo = nuevo_estado
        db_pedido.updated_at = datetime.utcnow()
        self.session.add(db_pedido)
        return db_pedido

    def flush(self) -> None:
        """Flush without committing"""
        self.session.flush()


class DetallePedidoRepository(BaseRepository[DetallePedido]):
    """Repository for DetallePedido entity (immutable snapshot — RN-04)"""

    def __init__(self, session: Session):
        super().__init__(session, DetallePedido)

    def get_by_pedido(self, pedido_id: int) -> List[DetallePedido]:
        """Get all detalles for a pedido"""
        statement = select(DetallePedido).where(DetallePedido.pedido_id == pedido_id)
        return self.session.exec(statement).all()

    def create(self, detalle: DetallePedido) -> DetallePedido:
        """Create a new detalle pedido (snapshot inmutable)"""
        return super().create(detalle)

    def update(self, *args, **kwargs):
        """RN-04: DetallePedido es un snapshot inmutable, no se permite modificar."""
        raise NotImplementedError("DetallePedido es inmutable (RN-04): no se permite UPDATE")

    def delete(self, *args, **kwargs):
        """RN-04: DetallePedido es un snapshot inmutable, no se permite eliminar."""
        raise NotImplementedError("DetallePedido es inmutable (RN-04): no se permite DELETE")

    def flush(self) -> None:
        """Flush without committing"""
        self.session.flush()


class PagoRepository(BaseRepository[Pago]):
    """Repository for Pago entity"""

    def __init__(self, session: Session):
        super().__init__(session, Pago)

    def get_by_pedido(self, pedido_id: int) -> List[Pago]:
        """Get all pagos for a pedido"""
        statement = select(Pago).where(Pago.pedido_id == pedido_id)
        return self.session.exec(statement).all()

    def create(self, pago: Pago) -> Pago:
        """Create a new pago"""
        return super().create(pago)

    def update(self, db_pago: Pago, pago_data: dict) -> Pago:
        """Update a pago"""
        pago_data["updated_at"] = datetime.utcnow()
        return super().update(db_pago, pago_data)

    def flush(self) -> None:
        """Flush without committing"""
        self.session.flush()


class HistorialEstadoPedidoRepository(BaseRepository[HistorialEstadoPedido]):
    """Repository for HistorialEstadoPedido entity (append-only audit trail — RN-03)"""

    def __init__(self, session: Session):
        super().__init__(session, HistorialEstadoPedido)

    def get_by_pedido(self, pedido_id: int) -> List[HistorialEstadoPedido]:
        """Get all historial entries for a pedido"""
        statement = select(HistorialEstadoPedido).where(HistorialEstadoPedido.pedido_id == pedido_id)
        return self.session.exec(statement).all()

    def create(self, historial: HistorialEstadoPedido) -> HistorialEstadoPedido:
        """Create a new historial entry (append-only)"""
        return super().create(historial)

    def update(self, *args, **kwargs):
        """RN-03: El historial es append-only, no se permite modificar registros."""
        raise NotImplementedError("HistorialEstadoPedido es append-only (RN-03): no se permite UPDATE")

    def delete(self, *args, **kwargs):
        """RN-03: El historial es append-only, no se permite eliminar registros."""
        raise NotImplementedError("HistorialEstadoPedido es append-only (RN-03): no se permite DELETE")

    def flush(self) -> None:
        """Flush without committing"""
        self.session.flush()
