"""Repository para consultas del panel admin."""

from typing import Dict, Any, List, Tuple
from sqlmodel import Session, select, func
from app.modules.usuarios.model import Usuario
from app.modules.pedidos.model import Pedido


class AdminRepository:
    """Repository para queries agregadas del dashboard."""

    def __init__(self, session: Session):
        self.session = session

    def count_usuarios_activos(self) -> int:
        return self.session.exec(
            select(func.count()).select_from(Usuario).where(Usuario.deleted_at.is_(None))
        ).one()

    def count_pedidos_activos(self) -> int:
        return self.session.exec(
            select(func.count()).select_from(Pedido).where(Pedido.deleted_at.is_(None))
        ).one()

    def count_pedidos_por_estado(self) -> List[Tuple[str, int]]:
        return self.session.exec(
            select(Pedido.estado_codigo, func.count())
            .where(Pedido.deleted_at.is_(None))
            .group_by(Pedido.estado_codigo)
        ).all()

    def get_ingresos_totales(self) -> float:
        result = self.session.exec(
            select(func.coalesce(func.sum(Pedido.total), 0))
            .where(Pedido.deleted_at.is_(None))
            .where(Pedido.estado_codigo.notin_(["CANCELADO"]))
        ).one()
        return float(result)
