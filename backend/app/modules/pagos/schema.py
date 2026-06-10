from typing import Optional
from datetime import datetime
from app.modules.pagos.model import PagoBase


class PagoCreate(PagoBase):
    external_reference: str
    idempotency_key: str


class PagoRead(PagoBase):
    id: int
    mp_payment_id: Optional[int] = None
    mp_status_detail: Optional[str] = None
    external_reference: str
    idempotency_key: str
    payment_method_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PagoUpdate(PagoBase):
    mp_status: Optional[str] = None
    mp_payment_id: Optional[int] = None
    mp_status_detail: Optional[str] = None
    transaction_amount: Optional[float] = None
