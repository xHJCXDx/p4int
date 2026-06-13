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

    def get_all_by_mp_payment_id(self, mp_payment_id: int) -> List[Pago]:
        """Get pagos by MercadoPago payment ID"""
        statement = select(Pago).where(Pago.mp_payment_id == mp_payment_id)
        return list(self.session.exec(statement).all())

    def get_by_external_reference(self, external_reference: str) -> Optional[Pago]:
        """Get pago by external reference (UUID del pedido)"""
        statement = select(Pago).where(Pago.external_reference == external_reference)
        return self.session.exec(statement).first()

    def get_by_id(self, pago_id: int) -> Optional[Pago]:
        """Get pago by ID"""
        return self.session.get(Pago, pago_id)

    def update(self, db_pago: Pago, pago_data: dict) -> Pago:
        """Update a pago con timestamp automático."""
        pago_data["updated_at"] = datetime.utcnow()
        return super().update(db_pago, pago_data)
