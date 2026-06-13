from typing import List, Optional
from decimal import Decimal
from datetime import date
from sqlmodel import SQLModel


class VentasPeriodoItem(SQLModel):
    """Cada punto del gráfico de ventas por período."""
    periodo: str
    total_ventas: Decimal
    cantidad_pedidos: int


class ProductoTopItem(SQLModel):
    """Producto rankeado por ingresos."""
    producto_id: int
    nombre: str
    ingresos: Decimal
    cantidad_vendida: int


class PedidosEstadoItem(SQLModel):
    """Distribución de pedidos por estado."""
    estado_codigo: str
    cantidad: int


class IngresosFormaPagoItem(SQLModel):
    """Ingresos agrupados por forma de pago."""
    forma_pago_codigo: str
    total: Decimal
    cantidad: int


class ResumenResponse(SQLModel):
    """KPIs del dashboard."""
    ventas_hoy: Decimal
    ticket_promedio: Decimal
    pedidos_activos: int
    ventas_mes_actual: Decimal
