from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from sqlmodel import SQLModel, Field
from app.modules.pedidos.model import PedidoBase, DetallePedidoBase, HistorialEstadoPedidoBase
from app.modules.pagos.schema import PagoRead


class LineaVentaIn(SQLModel):
    producto_id: int
    cantidad: int = Field(ge=1)
    personalizacion: Optional[List[int]] = None


# ============ PEDIDO ============
class PedidoCreateFromCheckout(SQLModel):
    """Schema usado por el checkout del cliente."""
    direccion_id: Optional[int] = None
    forma_pago_codigo: str
    notas: Optional[str] = None
    items: List[LineaVentaIn] = Field(min_length=1)


class PedidoCreate(PedidoBase):
    subtotal: Decimal
    descuento: Decimal = Decimal("0")
    costo_envio: Decimal = Decimal("50")
    total: Decimal

class DetalleInPedido(SQLModel):
    producto_id: int
    cantidad: int
    nombre_snapshot: str
    precio_snapshot: Decimal
    subtotal_snap: Decimal


class PedidoRead(PedidoBase):
    id: int
    subtotal: Decimal
    descuento: Decimal
    costo_envio: Decimal
    total: Decimal
    motivo_cancelacion: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    detalles: List[DetalleInPedido] = []

class PedidoUpdate(PedidoBase):
    usuario_id: Optional[int] = None
    direccion_id: Optional[int] = None
    estado_codigo: Optional[str] = None
    forma_pago_codigo: Optional[str] = None
    notas: Optional[str] = None
    subtotal: Optional[Decimal] = None
    descuento: Optional[Decimal] = None
    costo_envio: Optional[Decimal] = None
    total: Optional[Decimal] = None

# ============ DETALLE PEDIDO ============
class DetallePedidoCreate(DetallePedidoBase):
    nombre_snapshot: str
    precio_snapshot: Decimal
    subtotal_snap: Decimal

class DetallePedidoRead(DetallePedidoBase):
    pedido_id: int
    producto_id: int
    nombre_snapshot: str
    precio_snapshot: Decimal
    subtotal_snap: Decimal
    personalizacion: Optional[List[int]] = None
    created_at: datetime

# ============ AVANZAR ESTADO ============
class AvanzarEstadoRequest(SQLModel):
    nuevo_estado: str
    motivo: Optional[str] = None


# ============ HISTORIAL ESTADO PEDIDO ============
class HistorialEstadoPedidoCreate(HistorialEstadoPedidoBase):
    pass

class HistorialEstadoPedidoRead(SQLModel):
    id: int
    pedido_id: int
    estado_desde: Optional[str] = None
    estado_hacia: str
    usuario_id: Optional[int] = None
    motivo: Optional[str] = None
    created_at: datetime


class PedidoDetail(PedidoBase):
    id: int
    subtotal: Decimal
    descuento: Decimal
    costo_envio: Decimal
    total: Decimal
    motivo_cancelacion: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    items: List[DetallePedidoRead] = []
    historial: List[HistorialEstadoPedidoRead] = []
    pago: Optional[PagoRead] = None

    model_config = {"arbitrary_types_allowed": True}
