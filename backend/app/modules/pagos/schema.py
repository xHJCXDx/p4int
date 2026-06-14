from typing import Optional
from decimal import Decimal
from datetime import datetime
from sqlmodel import SQLModel


class PagoCreate(SQLModel):
    pedido_id: int
    transaction_amount: Decimal


class PagoRead(SQLModel):
    id: int
    pedido_id: int
    mp_payment_id: Optional[int] = None
    mp_status: str
    mp_status_detail: Optional[str] = None
    transaction_amount: Decimal
    external_reference: str
    idempotency_key: str
    payment_method_id: Optional[str] = None
    init_point: Optional[str] = None
    created_at: datetime
    updated_at: datetime
