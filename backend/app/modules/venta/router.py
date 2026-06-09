from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import get_current_user
from app.modules.venta.schema import (
    PedidoCreateFromCheckout, PedidoRead, PedidoUpdate,
    DetallePedidoCreate, DetallePedidoRead,
    PagoCreate, PagoRead, PagoUpdate,
)
from app.modules.usuario.model import Usuario
from app.modules.venta import service

router = APIRouter(prefix="/api/v1/pedidos", tags=["Pedidos"])


@router.get("/")
def read_pedidos(
    session: Session = Depends(get_session),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    usuario_id = current_user.id if service.is_client_only(current_user) else None
    pedidos, total = service.get_all_pedidos(session, limit, offset, usuario_id=usuario_id)
    return success_response(
        data={
            "items": [PedidoRead.model_validate(p) for p in pedidos],
            "total": total,
            "limit": limit,
            "offset": offset
        },
        message="Pedidos obtenidos exitosamente"
    )

@router.get("/{pedido_id}")
def read_pedido(
    pedido_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    pedido = service.get_pedido_by_id(session, pedido_id)
    if not pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    if service.is_client_only(current_user) and pedido.usuario_id != current_user.id:
        return error_response(message="No tienes permiso para ver este pedido", status_code=403)

    return success_response(
        data=PedidoRead.model_validate(pedido),
        message="Pedido obtenido exitosamente"
    )

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_pedido(
    pedido: PedidoCreateFromCheckout,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    """Crea un nuevo pedido desde el checkout."""
    try:
        new_pedido = service.create_pedido_from_checkout(session, pedido, current_user.id)
        return success_response(
            data=PedidoRead.model_validate(new_pedido),
            message="Pedido creado exitosamente",
            status_code=201
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)

@router.put("/{pedido_id}")
def update_pedido(
    pedido_id: int,
    pedido_update: PedidoUpdate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    """Actualiza un pedido (no cambia estado; usar transition_estado para eso)."""
    db_pedido = service.get_pedido_by_id(session, pedido_id)
    if not db_pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    if not service.is_admin_or_pedidos(current_user):
        return error_response(message="No tienes permiso para actualizar pedidos", status_code=403)

    updated_pedido = service.update_pedido(session, db_pedido, pedido_update)
    return success_response(
        data=PedidoRead.model_validate(updated_pedido),
        message="Pedido actualizado exitosamente"
    )

@router.delete("/{pedido_id}", status_code=status.HTTP_200_OK)
def delete_pedido(
    pedido_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    """Soft delete de un pedido."""
    db_pedido = service.get_pedido_by_id(session, pedido_id)
    if not db_pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    if not service.is_admin_or_pedidos(current_user):
        return error_response(message="No tienes permiso para eliminar pedidos", status_code=403)

    service.delete_pedido(session, db_pedido)
    return success_response(message="Pedido eliminado exitosamente")

@router.post("/{pedido_id}/transition-estado")
def transition_estado_pedido(
    pedido_id: int,
    accion: Optional[str] = Query(None, description="Acción simplificada (confirmar, preparar, enviar, entregar) o 'cancelar'"),
    nuevo_estado: Optional[str] = Query(None, description="Nuevo estado del pedido (alternativa a acción)"),
    usuario_id: Optional[int] = Query(None, description="ID del usuario que realiza la transición"),
    motivo: Optional[str] = Query(None, description="Motivo de la transición (obligatorio para CANCELADO)"),
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    # Resolver estado destino
    estado_destino, error = service.resolver_estado_destino(accion, nuevo_estado)
    if error:
        return error_response(message=error, status_code=400)

    pedido = service.get_pedido_by_id(session, pedido_id)
    if not pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    # Validación de permisos por rol
    if service.is_client_only(current_user):
        if pedido.usuario_id != current_user.id:
            return error_response(message="No tienes permiso para modificar pedidos ajenos", status_code=403)
        if estado_destino != "CANCELADO":
            return error_response(message="CLIENT solo puede cancelar su propio pedido", status_code=403)
    elif not service.is_admin_or_pedidos(current_user):
        return error_response(message="No tienes permiso para cambiar estados de pedidos", status_code=403)

    try:
        pedido = service.transition_estado(
            session,
            pedido_id,
            estado_destino,
            usuario_id=usuario_id or current_user.id,
            motivo=motivo
        )
        return success_response(
            data=PedidoRead.model_validate(pedido),
            message=f"Pedido transicionado a {estado_destino} exitosamente"
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)

@router.get("/{pedido_id}/detalles")
def read_detalles_pedido(
    pedido_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    pedido = service.get_pedido_by_id(session, pedido_id)
    if not pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    if service.is_client_only(current_user) and pedido.usuario_id != current_user.id:
        return error_response(message="No tienes permiso para ver los detalles de este pedido", status_code=403)

    detalles = service.get_detalles_by_pedido(session, pedido_id)
    return success_response(
        data=[DetallePedidoRead.model_validate(d) for d in detalles],
        message="Detalles del pedido obtenidos exitosamente"
    )

@router.post("/{pedido_id}/detalles", status_code=status.HTTP_201_CREATED)
def create_detalle_pedido(
    pedido_id: int,
    detalle: DetallePedidoCreate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    pedido = service.get_pedido_by_id(session, pedido_id)
    if not pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    if not service.is_admin_or_pedidos(current_user):
        return error_response(message="No tienes permiso para agregar detalles a pedidos", status_code=403)

    detalle.pedido_id = pedido_id

    try:
        new_detalle = service.create_detalle_pedido(session, detalle)
        return success_response(
            data=DetallePedidoRead.model_validate(new_detalle),
            message="Detalle del pedido creado exitosamente",
            status_code=201
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)

@router.get("/{pedido_id}/pagos")
def read_pagos_pedido(
    pedido_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    pedido = service.get_pedido_by_id(session, pedido_id)
    if not pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    if service.is_client_only(current_user) and pedido.usuario_id != current_user.id:
        return error_response(message="No tienes permiso para ver los pagos de este pedido", status_code=403)

    pagos = service.get_pagos_by_pedido(session, pedido_id)
    return success_response(
        data=[PagoRead.model_validate(p) for p in pagos],
        message="Pagos del pedido obtenidos exitosamente"
    )

@router.post("/{pedido_id}/pagos", status_code=status.HTTP_201_CREATED)
def create_pago_pedido(
    pedido_id: int,
    pago: PagoCreate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    pedido = service.get_pedido_by_id(session, pedido_id)
    if not pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    if not service.is_admin_or_pedidos(current_user):
        return error_response(message="No tienes permiso para registrar pagos", status_code=403)

    pago.pedido_id = pedido_id

    try:
        new_pago = service.create_pago(session, pago)
        return success_response(
            data=PagoRead.model_validate(new_pago),
            message="Pago creado exitosamente",
            status_code=201
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)

@router.put("/{pedido_id}/pagos/{pago_id}")
def update_pago_pedido(
    pedido_id: int,
    pago_id: int,
    pago_update: PagoUpdate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    pedido = service.get_pedido_by_id(session, pedido_id)
    if not pedido:
        return error_response(message="Pedido no encontrado", status_code=404)

    if not service.is_admin_or_pedidos(current_user):
        return error_response(message="No tienes permiso para actualizar pagos", status_code=403)

    db_pago = service.get_pago_by_id(session, pago_id)
    if not db_pago or db_pago.pedido_id != pedido_id:
        return error_response(message="Pago no encontrado", status_code=404)

    try:
        updated_pago = service.update_pago(session, db_pago, pago_update.model_dump())
        return success_response(
            data=PagoRead.model_validate(updated_pago),
            message="Pago actualizado exitosamente"
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)
