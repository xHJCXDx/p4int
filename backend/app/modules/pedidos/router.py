from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import get_current_user, require_roles
from app.modules.pedidos.schema import (
    PedidoCreateFromCheckout, PedidoRead,
    AvanzarEstadoRequest, HistorialEstadoPedidoRead,
)
from app.modules.usuarios.model import Usuario
from app.modules.pedidos import service

router = APIRouter(prefix="/api/v1/pedidos", tags=["Pedidos"])


@router.get("/")
def read_pedidos(
    session: Session = Depends(get_session),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Listar propios (CLIENT) o todos (ADMIN/PEDIDOS)."""
    pedidos, total = service.get_all_pedidos(session, limit, offset, current_user=current_user)
    return success_response(
        data={
            "items": [PedidoRead.model_validate(p) for p in pedidos],
            "total": total,
            "limit": limit,
            "offset": offset,
        },
        message="Pedidos obtenidos exitosamente",
    )


@router.get("/{pedido_id}")
def read_pedido(
    pedido_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Detalle completo con líneas, trazabilidad y pago."""
    try:
        pedido = service.get_pedido_with_permission(session, pedido_id, current_user)
        return success_response(
            data=PedidoRead.model_validate(pedido),
            message="Pedido obtenido exitosamente",
        )
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=404)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_pedido(
    pedido: PedidoCreateFromCheckout,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Crear pedido desde carrito. Todo en una transacción (UoW)."""
    try:
        new_pedido = service.create_pedido_from_checkout(session, pedido, current_user.id)
        return success_response(
            data=PedidoRead.model_validate(new_pedido),
            message="Pedido creado exitosamente",
            status_code=201,
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@router.patch("/{pedido_id}/estado", dependencies=[Depends(require_roles("ADMIN", "PEDIDOS"))])
def avanzar_estado(
    pedido_id: int,
    body: AvanzarEstadoRequest,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Avanzar estado según FSM. UoW atómico. Notifica WS post-commit."""
    try:
        pedido = service.get_pedido_by_id(session, pedido_id)
        if not pedido:
            return error_response(message="Pedido no encontrado", status_code=404)

        pedido = service.transition_estado(
            session,
            pedido_id,
            body.nuevo_estado,
            usuario_id=current_user.id,
            motivo=body.motivo,
        )
        return success_response(
            data=PedidoRead.model_validate(pedido),
            message=f"Pedido transicionado a {body.nuevo_estado}",
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@router.get("/{pedido_id}/historial")
def read_historial(
    pedido_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Historial completo. ORDER BY created_at ASC."""
    try:
        service.get_pedido_with_permission(session, pedido_id, current_user)
        historial = service.get_historial(session, pedido_id)
        return success_response(
            data=[HistorialEstadoPedidoRead.model_validate(h) for h in historial],
            message="Historial obtenido",
        )
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=404)


@router.delete("/{pedido_id}")
def cancel_pedido(
    pedido_id: int,
    motivo: Optional[str] = Query(None, description="Motivo de cancelación (obligatorio RN-05)"),
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Cancelar propio pedido (solo PENDIENTE o CONFIRMADO)."""
    try:
        pedido = service.get_pedido_by_id(session, pedido_id)
        if not pedido:
            return error_response(message="Pedido no encontrado", status_code=404)

        cancelled = service.cancel_pedido(session, pedido, current_user, motivo)
        return success_response(
            data=PedidoRead.model_validate(cancelled),
            message="Pedido cancelado",
        )
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=400)
