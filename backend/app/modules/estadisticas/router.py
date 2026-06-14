from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, ApiResponse
from app.core.security import require_roles
from app.core.constants import RolCode
from app.modules.estadisticas import service

router = APIRouter(
    prefix="/api/v1/estadisticas",
    tags=["Estadisticas"],
    dependencies=[Depends(require_roles(RolCode.ADMIN))],
)


@router.get("/resumen")
def resumen(
    session: Session = Depends(get_session),
) -> ApiResponse:
    """KPIs: ventas hoy, ticket promedio, pedidos activos, mes actual."""
    data = service.get_resumen(session)
    return success_response(data=data, message="Resumen obtenido")


@router.get("/ventas")
def ventas(
    desde: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    hasta: date = Query(default_factory=date.today),
    agrupacion: str = Query("day", pattern="^(day|week|month)$"),
    session: Session = Depends(get_session),
) -> ApiResponse:
    """Ventas por período con agrupación day/week/month."""
    data = service.get_ventas(session, desde, hasta, agrupacion)
    return success_response(data=data, message="Ventas obtenidas")


@router.get("/productos-top")
def productos_top(
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
) -> ApiResponse:
    """Top productos por ingresos (usa subtotal_snap)."""
    data = service.get_productos_top(session, limit)
    return success_response(data=data, message="Productos top obtenidos")


@router.get("/pedidos-por-estado")
def pedidos_por_estado(
    session: Session = Depends(get_session),
) -> ApiResponse:
    """Distribución de pedidos por estado actual."""
    data = service.get_pedidos_por_estado(session)
    return success_response(data=data, message="Distribución obtenida")


@router.get("/ingresos")
def ingresos(
    desde: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    hasta: date = Query(default_factory=date.today),
    session: Session = Depends(get_session),
) -> ApiResponse:
    """Ingresos por forma de pago (solo pagos approved)."""
    data = service.get_ingresos(session, desde, hasta)
    return success_response(data=data, message="Ingresos obtenidos")
