from typing import List
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from sqlmodel import Session
from app.modules.estadisticas.unit_of_work import EstadisticasUnitOfWork
from app.modules.estadisticas.schemas import (
    ResumenResponse,
    VentasPeriodoItem,
    ProductoTopItem,
    PedidosEstadoItem,
    IngresosFormaPagoItem,
)


TWO_PLACES = Decimal("0.01")


def _to_decimal(value) -> Decimal:
    """EST-04: convierte a DECIMAL(10,2)."""
    return Decimal(str(value)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def get_resumen(session: Session) -> ResumenResponse:
    with EstadisticasUnitOfWork(session) as uow:
        kpis = uow.estadisticas.get_resumen_kpis()
    return ResumenResponse(
        ventas_hoy=_to_decimal(kpis["ventas_hoy"]),
        ticket_promedio=_to_decimal(kpis["ticket_promedio"]),
        pedidos_activos=kpis["pedidos_activos"],
        ventas_mes_actual=_to_decimal(kpis["ventas_mes_actual"]),
    )


def get_ventas(
    session: Session,
    desde: date,
    hasta: date,
    agrupacion: str = "day",
) -> List[VentasPeriodoItem]:
    with EstadisticasUnitOfWork(session) as uow:
        rows = uow.estadisticas.get_ventas_periodo(desde, hasta, agrupacion)
    return [
        VentasPeriodoItem(
            periodo=str(row.periodo.date()) if hasattr(row.periodo, "date") else str(row.periodo),
            total_ventas=_to_decimal(row.total_ventas),
            cantidad_pedidos=row.cantidad_pedidos,
        )
        for row in rows
    ]


def get_productos_top(
    session: Session,
    limit: int = 10,
) -> List[ProductoTopItem]:
    with EstadisticasUnitOfWork(session) as uow:
        rows = uow.estadisticas.get_productos_top(limit)
    return [
        ProductoTopItem(
            producto_id=row.producto_id,
            nombre=row.nombre,
            ingresos=_to_decimal(row.ingresos),
            cantidad_vendida=row.cantidad_vendida,
        )
        for row in rows
    ]


def get_pedidos_por_estado(session: Session) -> List[PedidosEstadoItem]:
    with EstadisticasUnitOfWork(session) as uow:
        rows = uow.estadisticas.get_pedidos_por_estado()
    return [
        PedidosEstadoItem(
            estado_codigo=row.estado_codigo,
            cantidad=row.cantidad,
        )
        for row in rows
    ]


def get_ingresos(
    session: Session,
    desde: date,
    hasta: date,
) -> List[IngresosFormaPagoItem]:
    with EstadisticasUnitOfWork(session) as uow:
        rows = uow.estadisticas.get_ingresos_por_forma_pago(desde, hasta)
    return [
        IngresosFormaPagoItem(
            forma_pago_codigo=row.forma_pago_codigo,
            total=_to_decimal(row.total),
            cantidad=row.cantidad,
        )
        for row in rows
    ]
