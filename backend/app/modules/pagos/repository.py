from typing import List, Optional
from datetime import datetime
from sqlmodel import Session, select
from app.core.repository import BaseRepository
from app.modules.pagos.model import Pago


class PagoRepository(BaseRepository[Pago]):
    """Repository for Pago entity"""

    def __init__(self, session: Session):
        super().__init__(session, Pago)

    def get_by_pedido(self, pedido_id: int) -> List[Pago]:
        """Get all pagos for a pedido"""
        statement = select(Pago).where(Pago.pedido_id == pedido_id)
        return self.session.exec(statement).all()

    def get_by_id(self, pago_id: int) -> Optional[Pago]:
        """Get pago by ID"""
        return self.session.get(Pago, pago_id)

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
