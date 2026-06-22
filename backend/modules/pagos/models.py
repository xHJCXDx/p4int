from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Column
from sqlmodel import Field, Relationship, SQLModel

from backend.modules.pedidos.models import Pedido


class Pago(SQLModel, table=True):
    __tablename__ = "pago"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", nullable=False, index=True)
    mp_payment_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, unique=True, index=True),
    )
    mp_status: str = Field(default="pending", max_length=30, nullable=False)
    mp_status_detail: Optional[str] = Field(default=None, max_length=100)
    transaction_amount: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    payment_method_id: Optional[str] = Field(default=None, max_length=50)
    external_reference: str = Field(max_length=100, unique=True, index=True, nullable=False)
    idempotency_key: str = Field(max_length=100, unique=True, index=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    pedido: Optional[Pedido] = Relationship()
