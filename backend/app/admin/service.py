"""Service para el panel de administración."""

from typing import Dict, Any
from sqlmodel import Session
from app.admin.repository import AdminRepository


def get_dashboard_stats(session: Session) -> Dict[str, Any]:
    """Calcula estadísticas generales del sistema."""
    repo = AdminRepository(session)

    pedidos_por_estado = repo.count_pedidos_por_estado()

    return {
        "total_usuarios": repo.count_usuarios_activos(),
        "total_pedidos": repo.count_pedidos_activos(),
        "pedidos_por_estado": {estado: count for estado, count in pedidos_por_estado},
        "ingresos_totales": repo.get_ingresos_totales(),
    }
