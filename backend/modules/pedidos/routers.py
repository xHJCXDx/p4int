from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.auth.dependencies import get_current_user
from backend.modules.auth.models import Usuario
from backend.modules.pedidos.schemas import (
    AvanzarEstadoRequest,
    PedidoCreate,
    PedidoPaginatedResponse,
    PedidoReadFull,
)
from backend.modules.pedidos.services import PedidoService

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


def get_service(session: Session = Depends(get_session)) -> PedidoService:
    return PedidoService(session)


@router.post("", response_model=PedidoReadFull, status_code=status.HTTP_201_CREATED)
def crear_pedido(
    data: PedidoCreate,
    svc: PedidoService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.crear_pedido(current_user.id, data)


@router.get("", response_model=PedidoPaginatedResponse)
def list_pedidos(
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
    svc: PedidoService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.get_all(
        usuario_id=current_user.id,
        rol=current_user.rol,
        offset=offset,
        limit=limit,
    )


@router.get("/{pedido_id}", response_model=PedidoReadFull)
def get_pedido(
    pedido_id: int,
    svc: PedidoService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.get_by_id(
        pedido_id=pedido_id,
        usuario_id=current_user.id,
        rol=current_user.rol,
    )


@router.patch("/{pedido_id}/estado", response_model=PedidoReadFull)
def avanzar_estado(
    pedido_id: int,
    data: AvanzarEstadoRequest,
    svc: PedidoService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.avanzar_estado(
        pedido_id=pedido_id,
        data=data,
        usuario_id=current_user.id,
        rol=current_user.rol,
    )
