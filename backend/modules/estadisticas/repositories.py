from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import func
from sqlmodel import Session, select

from backend.modules.pedidos.models import DetallePedido, Pedido

APPROVED_SALES_STATES = ("CONFIRMADO", "EN_PREP", "ENTREGADO")


def _date_bounds(desde: date | None, hasta: date | None) -> tuple[datetime | None, datetime | None]:
    start = datetime.combine(desde, time.min) if desde else None
    end = datetime.combine(hasta, time.max) if hasta else None
    return start, end


class EstadisticasRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def resumen(self) -> dict:
        today = datetime.utcnow().date()
        start = datetime.combine(today, time.min)
        end = datetime.combine(today, time.max)

        ventas_hoy = self.session.exec(
            select(func.coalesce(func.sum(Pedido.total), 0))
            .where(Pedido.deleted_at.is_(None))
            .where(Pedido.estado_codigo.in_(APPROVED_SALES_STATES))
            .where(Pedido.created_at.between(start, end))
        ).one()
        pedidos_totales = self.session.exec(
            select(func.count(Pedido.id)).where(Pedido.deleted_at.is_(None))
        ).one()
        pedidos_activos = self.session.exec(
            select(func.count(Pedido.id))
            .where(Pedido.deleted_at.is_(None))
            .where(Pedido.estado_codigo.notin_(["ENTREGADO", "CANCELADO"]))
        ).one()
        ticket_promedio = self.session.exec(
            select(func.coalesce(func.avg(Pedido.total), 0))
            .where(Pedido.deleted_at.is_(None))
            .where(Pedido.estado_codigo.in_(APPROVED_SALES_STATES))
        ).one()

        return {
            "ventas_hoy": Decimal(str(ventas_hoy)),
            "ticket_promedio": Decimal(str(ticket_promedio)),
            "pedidos_activos": int(pedidos_activos),
            "pedidos_totales": int(pedidos_totales),
        }

    def ventas_por_periodo(self, desde: date | None, hasta: date | None) -> list[dict]:
        start, end = _date_bounds(desde, hasta)
        periodo = func.date(Pedido.created_at).label("periodo")
        stmt = (
            select(periodo, func.coalesce(func.sum(Pedido.total), 0), func.count(Pedido.id))
            .where(Pedido.deleted_at.is_(None))
            .where(Pedido.estado_codigo.in_(APPROVED_SALES_STATES))
            .group_by(periodo)
            .order_by(periodo)
        )
        if start:
            stmt = stmt.where(Pedido.created_at >= start)
        if end:
            stmt = stmt.where(Pedido.created_at <= end)

        return [
            {"periodo": row[0], "total": Decimal(str(row[1])), "pedidos": int(row[2])}
            for row in self.session.exec(stmt).all()
        ]

    def productos_top(self, desde: date | None, hasta: date | None, limit: int) -> list[dict]:
        start, end = _date_bounds(desde, hasta)
        stmt = (
            select(
                DetallePedido.producto_id,
                DetallePedido.nombre_snapshot,
                func.coalesce(func.sum(DetallePedido.cantidad), 0),
                func.coalesce(func.sum(DetallePedido.subtotal_snap), 0),
            )
            .join(Pedido, Pedido.id == DetallePedido.pedido_id)
            .where(Pedido.deleted_at.is_(None))
            .where(Pedido.estado_codigo.in_(APPROVED_SALES_STATES))
            .group_by(DetallePedido.producto_id, DetallePedido.nombre_snapshot)
            .order_by(func.sum(DetallePedido.subtotal_snap).desc())
            .limit(limit)
        )
        if start:
            stmt = stmt.where(Pedido.created_at >= start)
        if end:
            stmt = stmt.where(Pedido.created_at <= end)

        return [
            {"producto_id": int(row[0]), "nombre": row[1], "cantidad": int(row[2]), "total": Decimal(str(row[3]))}
            for row in self.session.exec(stmt).all()
        ]

    def pedidos_por_estado(self) -> list[dict]:
        stmt = (
            select(Pedido.estado_codigo, func.count(Pedido.id))
            .where(Pedido.deleted_at.is_(None))
            .group_by(Pedido.estado_codigo)
            .order_by(Pedido.estado_codigo)
        )
        return [{"estado": row[0], "cantidad": int(row[1])} for row in self.session.exec(stmt).all()]

    def ingresos_por_forma_pago(self, desde: date | None, hasta: date | None) -> list[dict]:
        start, end = _date_bounds(desde, hasta)
        stmt = (
            select(Pedido.forma_pago_codigo, func.coalesce(func.sum(Pedido.total), 0))
            .where(Pedido.deleted_at.is_(None))
            .where(Pedido.estado_codigo.in_(APPROVED_SALES_STATES))
            .group_by(Pedido.forma_pago_codigo)
            .order_by(Pedido.forma_pago_codigo)
        )
        if start:
            stmt = stmt.where(Pedido.created_at >= start)
        if end:
            stmt = stmt.where(Pedido.created_at <= end)

        return [{"forma_pago": row[0], "total": Decimal(str(row[1]))} for row in self.session.exec(stmt).all()]
