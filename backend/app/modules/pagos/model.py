from typing import Optional
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel


class PagoBase(SQLModel):
    pedido_id: int = Field(foreign_key="pedido.id")
    mp_status: str = Field(max_length=30)
    transaction_amount: float = Field(ge=0)


class Pago(PagoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    mp_payment_id: Optional[int] = Field(default=None, unique=True)
    mp_status_detail: Optional[str] = Field(default=None, max_length=100)
    external_reference: str = Field(unique=True, max_length=100)
    idempotency_key: str = Field(unique=True, max_length=100)
    payment_method_id: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    pedido: Optional["Pedido"] = Relationship(back_populates="pagos")  # noqa: F821
