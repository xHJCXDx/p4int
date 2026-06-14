from typing import List, Optional
from decimal import Decimal
from datetime import date
from sqlmodel import Session, select, func
from sqlalchemy import case
from app.modules.pedidos.model import Pedido, DetallePedido
from app.modules.pagos.model import Pago


ESTADOS_TERMINALES_EXCLUIDOS = ("CANCELADO",)


def _date_trunc(agrupacion: str, column, session: Session):
    """date_trunc compatible con PostgreSQL y SQLite.

    PostgreSQL usa func.date_trunc(); SQLite usa func.strftime() como fallback.
    El dialecto se detecta en runtime desde session.bind.
    """
    dialect = session.bind.dialect.name if session.bind else "sqlite"
    if dialect == "postgresql":
        return func.date_trunc(agrupacion, column)
    # SQLite fallback
    fmt_map = {"day": "%Y-%m-%d", "week": "%Y-%W", "month": "%Y-%m"}
    fmt = fmt_map.get(agrupacion, "%Y-%m-%d")
    return func.strftime(fmt, column)


def _cast_to_date(column):
    """Extrae DATE de un datetime. Portable: SQLite (date()), PostgreSQL (CAST AS DATE)."""
    return func.date(column)


class EstadisticasRepository:
    """Queries de solo lectura contra tablas existentes.
    No extiende BaseRepository — no hace CRUD.
    """

    def __init__(self, session: Session):
        self.session = session

    # ── Ventas por período ──────────────────────────────────────────
    def get_ventas_periodo(
        self,
        desde: date,
        hasta: date,
        agrupacion: str = "day",
    ) -> list:
        """EST-01: excluye CANCELADO.  EST-05: filtra con BETWEEN sobre date."""
        trunc = _date_trunc(agrupacion, Pedido.created_at, self.session)
        stmt = (
            select(
                trunc.label("periodo"),
                func.coalesce(func.sum(Pedido.total), 0).label("total_ventas"),
                func.count(Pedido.id).label("cantidad_pedidos"),
            )
            .where(
                Pedido.deleted_at.is_(None),
                Pedido.estado_codigo.notin_(ESTADOS_TERMINALES_EXCLUIDOS),
                _cast_to_date(Pedido.created_at).between(desde, hasta),
            )
            .group_by(trunc)
            .order_by(trunc)
        )
        return self.session.exec(stmt).all()

    # ── Top productos ───────────────────────────────────────────────
    def get_productos_top(self, limit: int = 10) -> list:
        """EST-01 + EST-02: usa subtotal_snap de DetallePedido.
        Excluye pedidos CANCELADO vía join.
        """
        stmt = (
            select(
                DetallePedido.producto_id,
                DetallePedido.nombre_snapshot.label("nombre"),
                func.coalesce(func.sum(DetallePedido.subtotal_snap), 0).label("ingresos"),
                func.coalesce(func.sum(DetallePedido.cantidad), 0).label("cantidad_vendida"),
            )
            .join(Pedido, Pedido.id == DetallePedido.pedido_id)
            .where(
                Pedido.deleted_at.is_(None),
                Pedido.estado_codigo.notin_(ESTADOS_TERMINALES_EXCLUIDOS),
            )
            .group_by(DetallePedido.producto_id, DetallePedido.nombre_snapshot)
            .order_by(func.sum(DetallePedido.subtotal_snap).desc())
            .limit(limit)
        )
        return self.session.exec(stmt).all()

    # ── Pedidos por estado ──────────────────────────────────────────
    def get_pedidos_por_estado(self) -> list:
        """Simple GROUP BY sobre estado actual."""
        stmt = (
            select(
                Pedido.estado_codigo,
                func.count(Pedido.id).label("cantidad"),
            )
            .where(Pedido.deleted_at.is_(None))
            .group_by(Pedido.estado_codigo)
        )
        return self.session.exec(stmt).all()

    # ── Ingresos por forma de pago ──────────────────────────────────
    def get_ingresos_por_forma_pago(
        self,
        desde: date,
        hasta: date,
    ) -> list:
        """EST-03: solo pagos con mp_status = 'approved'."""
        stmt = (
            select(
                Pedido.forma_pago_codigo,
                func.coalesce(func.sum(Pago.transaction_amount), 0).label("total"),
                func.count(Pago.id).label("cantidad"),
            )
            .join(Pedido, Pedido.id == Pago.pedido_id)
            .where(
                Pago.mp_status == "approved",
                Pedido.deleted_at.is_(None),
                Pedido.estado_codigo.notin_(ESTADOS_TERMINALES_EXCLUIDOS),
                _cast_to_date(Pedido.created_at).between(desde, hasta),
            )
            .group_by(Pedido.forma_pago_codigo)
        )
        return self.session.exec(stmt).all()

    # ── KPIs para resumen ───────────────────────────────────────────
    def get_resumen_kpis(self) -> dict:
        """Cada KPI es una query separada. EST-01 aplicada."""
        hoy = func.date(func.current_timestamp())
        dialect = self.session.bind.dialect.name if self.session.bind else "sqlite"
        if dialect == "postgresql":
            inicio_mes = func.date_trunc("month", func.current_timestamp())
        else:
            inicio_mes = func.strftime("%Y-%m-01", func.current_timestamp())

        base = select(Pedido).where(
            Pedido.deleted_at.is_(None),
            Pedido.estado_codigo.notin_(ESTADOS_TERMINALES_EXCLUIDOS),
        )

        # Ventas hoy
        ventas_hoy_stmt = select(
            func.coalesce(func.sum(Pedido.total), 0)
        ).where(
            Pedido.deleted_at.is_(None),
            Pedido.estado_codigo.notin_(ESTADOS_TERMINALES_EXCLUIDOS),
            _cast_to_date(Pedido.created_at) == hoy,
        )
        ventas_hoy = self.session.exec(ventas_hoy_stmt).one()

        # Ticket promedio (global, no solo hoy)
        ticket_stmt = select(
            func.coalesce(func.avg(Pedido.total), 0)
        ).where(
            Pedido.deleted_at.is_(None),
            Pedido.estado_codigo.notin_(ESTADOS_TERMINALES_EXCLUIDOS),
        )
        ticket_promedio = self.session.exec(ticket_stmt).one()

        # Pedidos activos (estados no terminales)
        activos_stmt = select(
            func.count(Pedido.id)
        ).where(
            Pedido.deleted_at.is_(None),
            Pedido.estado_codigo.notin_(("CANCELADO", "ENTREGADO")),
        )
        pedidos_activos = self.session.exec(activos_stmt).one()

        # Ventas mes actual
        ventas_mes_stmt = select(
            func.coalesce(func.sum(Pedido.total), 0)
        ).where(
            Pedido.deleted_at.is_(None),
            Pedido.estado_codigo.notin_(ESTADOS_TERMINALES_EXCLUIDOS),
            Pedido.created_at >= inicio_mes,
        )
        ventas_mes = self.session.exec(ventas_mes_stmt).one()

        return {
            "ventas_hoy": ventas_hoy,
            "ticket_promedio": ticket_promedio,
            "pedidos_activos": pedidos_activos,
            "ventas_mes_actual": ventas_mes,
        }
