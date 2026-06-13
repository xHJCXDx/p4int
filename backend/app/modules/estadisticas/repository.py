from typing import List, Optional
from decimal import Decimal
from datetime import date
from sqlmodel import Session, select, func, text
from sqlalchemy import case
from app.modules.pedidos.model import Pedido, DetallePedido
from app.modules.pagos.model import Pago


ESTADOS_TERMINALES_EXCLUIDOS = ("CANCELADO",)


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
        trunc = func.date_trunc(agrupacion, Pedido.created_at)
        stmt = (
            select(
                trunc.label("periodo"),
                func.coalesce(func.sum(Pedido.total), 0).label("total_ventas"),
                func.count(Pedido.id).label("cantidad_pedidos"),
            )
            .where(
                Pedido.deleted_at.is_(None),
                Pedido.estado_codigo.notin_(ESTADOS_TERMINALES_EXCLUIDOS),
                func.cast(Pedido.created_at, text("DATE")).between(desde, hasta),
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
                func.cast(Pedido.created_at, text("DATE")).between(desde, hasta),
            )
            .group_by(Pedido.forma_pago_codigo)
        )
        return self.session.exec(stmt).all()

    # ── KPIs para resumen ───────────────────────────────────────────
    def get_resumen_kpis(self) -> dict:
        """Cada KPI es una query separada. EST-01 aplicada."""
        hoy = func.current_date()
        inicio_mes = func.date_trunc("month", func.current_date())

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
            func.cast(Pedido.created_at, text("DATE")) == hoy,
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
