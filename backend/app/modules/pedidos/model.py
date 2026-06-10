from typing import List, Optional
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel, JSON


class PedidoBase(SQLModel):
    usuario_id: int = Field(foreign_key="usuario.id")
    direccion_id: Optional[int] = Field(default=None, foreign_key="direccionentrega.id")
    estado_codigo: str = Field(foreign_key="estadopedido.codigo")
    forma_pago_codigo: str = Field(foreign_key="formapago.codigo")
    notas: Optional[str] = None


class Pedido(PedidoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    subtotal: float = Field(ge=0)
    descuento: float = Field(default=0.0, ge=0)
    costo_envio: float = Field(default=50.0, ge=0)
    total: float = Field(ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    detalles: List["DetallePedido"] = Relationship(back_populates="pedido", cascade_delete=True)
    pagos: List["Pago"] = Relationship(back_populates="pedido", cascade_delete=True)  # noqa: F821
    historial: List["HistorialEstadoPedido"] = Relationship(back_populates="pedido", cascade_delete=True)


class DetallePedidoBase(SQLModel):
    pedido_id: int = Field(foreign_key="pedido.id")
    producto_id: int = Field(foreign_key="producto.id")
    cantidad: int = Field(ge=1)
    personalizacion: List[int] = Field(default=[], sa_type=JSON)


class DetallePedido(DetallePedidoBase, table=True):
    pedido_id: int = Field(foreign_key="pedido.id", primary_key=True)
    producto_id: int = Field(foreign_key="producto.id", primary_key=True)
    nombre_snapshot: str = Field(max_length=200)
    precio_snapshot: float = Field(ge=0)
    subtotal_snap: float = Field(ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    pedido: Optional[Pedido] = Relationship(back_populates="detalles")


class HistorialEstadoPedidoBase(SQLModel):
    pedido_id: int = Field(foreign_key="pedido.id")
    estado_hacia: str = Field(foreign_key="estadopedido.codigo", max_length=20)
    estado_desde: Optional[str] = Field(default=None, foreign_key="estadopedido.codigo", max_length=20)
    usuario_id: Optional[int] = Field(default=None, foreign_key="usuario.id")
    motivo: Optional[str] = None


class HistorialEstadoPedido(HistorialEstadoPedidoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    pedido: Optional[Pedido] = Relationship(back_populates="historial")
