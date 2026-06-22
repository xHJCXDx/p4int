from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import CheckConstraint, Field, Relationship, SQLModel

if TYPE_CHECKING:
    from backend.modules.direcciones.models import DireccionEntrega


class FormaPago(SQLModel, table=True):
    __tablename__ = "forma_pago"

    codigo: str = Field(primary_key=True, max_length=20)
    descripcion: str = Field(max_length=80, nullable=False)
    habilitado: bool = Field(default=True, nullable=False)


class EstadoPedido(SQLModel, table=True):
    __tablename__ = "estado_pedido"

    codigo: str = Field(primary_key=True, max_length=20)
    descripcion: str = Field(max_length=80, nullable=False)
    orden: int = Field(nullable=False)
    es_terminal: bool = Field(nullable=False)


class Pedido(SQLModel, table=True):
    __tablename__ = "pedido"

    id: Optional[int] = Field(default=None, primary_key=True)

    usuario_id: int = Field(foreign_key="usuario.id", nullable=False)
    direccion_id: Optional[int] = Field(default=None, foreign_key="direccion_entrega.id")
    estado_codigo: str = Field(foreign_key="estado_pedido.codigo", max_length=20, default="PENDIENTE", nullable=False)
    forma_pago_codigo: str = Field(foreign_key="forma_pago.codigo", max_length=20, nullable=False)

    subtotal: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    descuento: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    costo_envio: Decimal = Field(default=Decimal("50"), max_digits=10, decimal_places=2)
    total: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)

    notas: Optional[str] = Field(default=None)

    __table_args__ = (
        CheckConstraint("total >= 0", name="check_pedido_total_positive"),
        CheckConstraint("descuento >= 0", name="check_pedido_descuento_positive"),
        CheckConstraint("costo_envio >= 0", name="check_pedido_costo_envio_positive"),
    )

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)

    direccion: Optional["DireccionEntrega"] = Relationship(back_populates="pedidos")
    detalles: List["DetallePedido"] = Relationship(back_populates="pedido")
    historial: List["HistorialEstadoPedido"] = Relationship(back_populates="pedido")


class DetallePedido(SQLModel, table=True):
    __tablename__ = "detalle_pedido"

    # PK compuesta — sin id surrogate
    pedido_id: int = Field(foreign_key="pedido.id", primary_key=True)
    producto_id: int = Field(foreign_key="producto.id", primary_key=True)

    cantidad: int = Field(ge=1, nullable=False)

    # Snapshot inmutable
    nombre_snapshot: str = Field(max_length=200, nullable=False)
    precio_snapshot: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    subtotal_snap: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)

    # IDs de ingredientes removidos por el cliente (ej: [3, 7])
    personalizacion: List[int] = Field(default_factory=list, sa_column=Column(JSON))

    __table_args__ = (
        CheckConstraint("cantidad >= 1", name="check_detalle_cantidad_positive"),
        CheckConstraint("precio_snapshot >= 0", name="check_detalle_precio_positive"),
        CheckConstraint("subtotal_snap >= 0", name="check_detalle_subtotal_positive"),
    )

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    pedido: Optional["Pedido"] = Relationship(back_populates="detalles")


class HistorialEstadoPedido(SQLModel, table=True):
    __tablename__ = "historial_estado_pedido"

    id: Optional[int] = Field(default=None, primary_key=True)

    pedido_id: int = Field(foreign_key="pedido.id", nullable=False)
    estado_desde: Optional[str] = Field(default=None, foreign_key="estado_pedido.codigo", max_length=20)
    estado_hacia: str = Field(foreign_key="estado_pedido.codigo", max_length=20, nullable=False)
    usuario_id: Optional[int] = Field(default=None, foreign_key="usuario.id")

    # Obligatorio cuando estado_hacia = CANCELADO
    motivo: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    pedido: Optional["Pedido"] = Relationship(back_populates="historial")
