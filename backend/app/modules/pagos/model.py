from typing import Optional
from decimal import Decimal
from datetime import datetime, timezone
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Numeric, Column, String, CheckConstraint
from app.core.types import PortableBigInt

MP_STATUS_VALUES = ("pending", "approved", "rejected")


class PagoBase(SQLModel):
    pedido_id: int = Field(foreign_key="pedido.id")
    mp_status: str = Field(max_length=30)
    transaction_amount: Decimal = Field(sa_type=Numeric(10, 2), ge=0)


class Pago(PagoBase, table=True):
    __table_args__ = (
        CheckConstraint("mp_status IN ('pending', 'approved', 'rejected')", name="ck_pago_mp_status"),
    )
    id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, primary_key=True, autoincrement=True))
    mp_payment_id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, unique=True, nullable=True))
    mp_status_detail: Optional[str] = Field(default=None, max_length=100)
    external_reference: str = Field(unique=True, max_length=100)
    idempotency_key: str = Field(unique=True, max_length=100)
    payment_method_id: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pedido: Optional["Pedido"] = Relationship(back_populates="pagos")  # noqa: F821
