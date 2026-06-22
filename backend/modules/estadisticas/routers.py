from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.auth.dependencies import require_roles
from backend.modules.auth.models import Rol, Usuario
from backend.modules.estadisticas.schemas import (
    EstadisticasResumen,
    IngresoPorFormaPago,
    PedidoPorEstado,
    ProductoTop,
    VentaPorPeriodo,
)
from backend.modules.estadisticas.services import EstadisticasService

router = APIRouter(prefix="/estadisticas", tags=["estadisticas"])


def get_service(session: Session = Depends(get_session)) -> EstadisticasService:
    return EstadisticasService(session)


@router.get("/resumen", response_model=EstadisticasResumen)
def get_resumen(
    svc: EstadisticasService = Depends(get_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN, Rol.PEDIDOS)),
):
    return svc.resumen()


@router.get("/ventas", response_model=list[VentaPorPeriodo])
def get_ventas(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    svc: EstadisticasService = Depends(get_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN, Rol.PEDIDOS)),
):
    return svc.ventas(desde, hasta)


@router.get("/productos-top", response_model=list[ProductoTop])
def get_productos_top(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    svc: EstadisticasService = Depends(get_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN, Rol.PEDIDOS)),
):
    return svc.productos_top(desde, hasta, limit)


@router.get("/pedidos-por-estado", response_model=list[PedidoPorEstado])
def get_pedidos_por_estado(
    svc: EstadisticasService = Depends(get_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN, Rol.PEDIDOS)),
):
    return svc.pedidos_por_estado()


@router.get("/ingresos", response_model=list[IngresoPorFormaPago])
def get_ingresos(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    svc: EstadisticasService = Depends(get_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN, Rol.PEDIDOS)),
):
    return svc.ingresos(desde, hasta)
