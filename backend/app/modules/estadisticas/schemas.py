from typing import Annotated, List, Optional
from decimal import Decimal
from datetime import date
from pydantic import PlainSerializer
from sqlmodel import SQLModel

# Decimal que serializa como float en JSON (evita que Pydantic v2 envíe strings)
JsonDecimal = Annotated[Decimal, PlainSerializer(float, return_type=float)]


class VentasPeriodoItem(SQLModel):
    """Cada punto del gráfico de ventas por período."""
    periodo: str
    total_ventas: JsonDecimal
    cantidad_pedidos: int


class ProductoTopItem(SQLModel):
    """Producto rankeado por ingresos."""
    producto_id: int
    nombre: str
    ingresos: JsonDecimal
    cantidad_vendida: int


class PedidosEstadoItem(SQLModel):
    """Distribución de pedidos por estado."""
    estado_codigo: str
    cantidad: int


class IngresosFormaPagoItem(SQLModel):
    """Ingresos agrupados por forma de pago."""
    forma_pago_codigo: str
    total: JsonDecimal
    cantidad: int


class ResumenResponse(SQLModel):
    """KPIs del dashboard."""
    ventas_hoy: JsonDecimal
    ticket_promedio: JsonDecimal
    pedidos_activos: int
    ventas_mes_actual: JsonDecimal
