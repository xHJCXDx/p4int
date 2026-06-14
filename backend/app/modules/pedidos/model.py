from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timezone
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, Integer, Numeric
from app.core.types import PortableArray, PortableBigInt


class PedidoBase(SQLModel):
    usuario_id: int = Field(foreign_key="usuario.id")
    direccion_id: Optional[int] = Field(default=None, foreign_key="direccionentrega.id")
    estado_codigo: str = Field(foreign_key="estadopedido.codigo")
    forma_pago_codigo: str = Field(foreign_key="formapago.codigo")
    notas: Optional[str] = None


class Pedido(PedidoBase, table=True):
    id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, primary_key=True, autoincrement=True))
    subtotal: Decimal = Field(sa_type=Numeric(10, 2), ge=0)
    descuento: Decimal = Field(default=Decimal("0.00"), sa_type=Numeric(10, 2), ge=0)
    costo_envio: Decimal = Field(default=Decimal("50.00"), sa_type=Numeric(10, 2), ge=0)
    total: Decimal = Field(sa_type=Numeric(10, 2), ge=0)
    motivo_cancelacion: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None
    detalles: List["DetallePedido"] = Relationship(back_populates="pedido", cascade_delete=True)
    pagos: List["Pago"] = Relationship(back_populates="pedido", cascade_delete=True)  # noqa: F821
    historial: List["HistorialEstadoPedido"] = Relationship(back_populates="pedido", cascade_delete=True)


class DetallePedidoBase(SQLModel):
    pedido_id: int = Field(foreign_key="pedido.id")
    producto_id: int = Field(foreign_key="producto.id")
    cantidad: int = Field(ge=1)
    personalizacion: Optional[List[int]] = Field(default=None, sa_type=PortableArray(Integer))


class DetallePedido(DetallePedidoBase, table=True):
    pedido_id: int = Field(foreign_key="pedido.id", primary_key=True)
    producto_id: int = Field(foreign_key="producto.id", primary_key=True)
    nombre_snapshot: str = Field(max_length=200)
    precio_snapshot: Decimal = Field(sa_type=Numeric(10, 2), ge=0)
    subtotal_snap: Decimal = Field(sa_type=Numeric(10, 2), ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pedido: Optional[Pedido] = Relationship(back_populates="detalles")


class HistorialEstadoPedidoBase(SQLModel):
    pedido_id: int = Field(foreign_key="pedido.id")
    estado_hacia: str = Field(foreign_key="estadopedido.codigo", max_length=20)
    estado_desde: Optional[str] = Field(default=None, foreign_key="estadopedido.codigo", max_length=20)
    usuario_id: Optional[int] = Field(default=None, foreign_key="usuario.id")
    motivo: Optional[str] = None


class HistorialEstadoPedido(HistorialEstadoPedidoBase, table=True):
    id: Optional[int] = Field(default=None, sa_column=Column(PortableBigInt, primary_key=True, autoincrement=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pedido: Optional[Pedido] = Relationship(back_populates="historial")
