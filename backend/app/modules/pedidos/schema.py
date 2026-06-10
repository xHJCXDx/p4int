from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel
from app.modules.pedidos.model import PedidoBase, DetallePedidoBase, HistorialEstadoPedidoBase


class LineaVentaIn(SQLModel):
    producto_id: int
    cantidad: int


# ============ PEDIDO ============
class PedidoCreateFromCheckout(SQLModel):
    """Schema usado por el checkout del cliente."""
    direccion_id: int
    forma_pago_codigo: str
    notas: Optional[str] = None
    linea_ventas: List[LineaVentaIn]


class PedidoCreate(PedidoBase):
    subtotal: float
    descuento: float = 0.0
    costo_envio: float = 50.0
    total: float

class DetalleInPedido(SQLModel):
    producto_id: int
    cantidad: int
    nombre_snapshot: str
    precio_snapshot: float
    subtotal_snap: float


class PedidoRead(PedidoBase):
    id: int
    subtotal: float
    descuento: float
    costo_envio: float
    total: float
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
    subtotal: Optional[float] = None
    descuento: Optional[float] = None
    costo_envio: Optional[float] = None
    total: Optional[float] = None

# ============ DETALLE PEDIDO ============
class DetallePedidoCreate(DetallePedidoBase):
    nombre_snapshot: str
    precio_snapshot: float
    subtotal_snap: float

class DetallePedidoRead(DetallePedidoBase):
    pedido_id: int
    producto_id: int
    nombre_snapshot: str
    precio_snapshot: float
    subtotal_snap: float
    created_at: datetime

# ============ HISTORIAL ESTADO PEDIDO ============
class HistorialEstadoPedidoCreate(HistorialEstadoPedidoBase):
    pass

class HistorialEstadoPedidoRead(HistorialEstadoPedidoBase):
    id: int
    created_at: datetime
