from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel


class PagoCreate(SQLModel):
    pedido_id: int
    transaction_amount: float


class PagoRead(SQLModel):
    id: int
    pedido_id: int
    mp_payment_id: Optional[int] = None
    mp_status: str
    mp_status_detail: Optional[str] = None
    transaction_amount: float
    external_reference: str
    idempotency_key: str
    payment_method_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
