from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class EstadisticasResumen(BaseModel):
    ventas_hoy: Decimal
    ticket_promedio: Decimal
    pedidos_activos: int
    pedidos_totales: int


class VentaPorPeriodo(BaseModel):
    periodo: date
    total: Decimal
    pedidos: int


class ProductoTop(BaseModel):
    producto_id: int
    nombre: str
    cantidad: int
    total: Decimal


class PedidoPorEstado(BaseModel):
    estado: str
    cantidad: int


class IngresoPorFormaPago(BaseModel):
    forma_pago: str
    total: Decimal
