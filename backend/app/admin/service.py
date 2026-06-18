"""Service para el panel de administración."""

from typing import Dict, Any
from sqlmodel import Session
from app.admin.unit_of_work import AdminUnitOfWork


def get_dashboard_stats(session: Session) -> Dict[str, Any]:
    """Calcula estadísticas generales del sistema."""
    with AdminUnitOfWork(session) as uow:
        pedidos_por_estado = uow.repo.count_pedidos_por_estado()

        return {
            "total_usuarios": uow.repo.count_usuarios_activos(),
            "total_pedidos": uow.repo.count_pedidos_activos(),
            "pedidos_por_estado": {estado: count for estado, count in pedidos_por_estado},
            "ingresos_totales": float(uow.repo.get_ingresos_totales()),
        }
