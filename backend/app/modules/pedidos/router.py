from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, paginated_response, error_response, paginate_offset, ApiResponse, BusinessRuleError
from app.core.security import get_current_user, require_roles
from app.core.constants import RolCode
from app.modules.pedidos.schema import (
    PedidoCreateFromCheckout, PedidoRead,
    AvanzarEstadoRequest, HistorialEstadoPedidoRead,
    CancelPedidoRequest,
)
from app.modules.usuarios.model import Usuario
from app.modules.pedidos import service

router = APIRouter(prefix="/api/v1/pedidos", tags=["Pedidos"])


@router.get("/")
def read_pedidos(
    session: Session = Depends(get_session),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Elementos por página"),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Listar propios (CLIENT) o todos (ADMIN/PEDIDOS)."""
    pedidos, total = service.get_all_pedidos(session, size, paginate_offset(page, size), current_user=current_user)
    return paginated_response(
        items=[PedidoRead.model_validate(p) for p in pedidos],
        total=total,
        page=page,
        size=size,
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
        detail = service.get_pedido_detail(session, pedido_id, current_user)
        return success_response(
            data=detail,
            message="Pedido obtenido exitosamente",
        )
    except PermissionError as e:
        return error_response(detail=str(e), status_code=403, code="FORBIDDEN")
    except ValueError as e:
        return error_response(detail=str(e), status_code=404, code="NOT_FOUND")


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
    except BusinessRuleError as e:
        return error_response(detail=e.detail, status_code=e.status_code, code=e.code, field=e.field)
    except ValueError as e:
        return error_response(detail=str(e), status_code=400, code="VALIDATION_ERROR")


@router.patch("/{pedido_id}/estado", dependencies=[Depends(require_roles(RolCode.ADMIN, RolCode.PEDIDOS))])
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
            return error_response(detail="Pedido no encontrado", status_code=404, code="NOT_FOUND")

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
        return error_response(detail=str(e), status_code=400, code="INVALID_TRANSITION")


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
        return error_response(detail=str(e), status_code=403, code="FORBIDDEN")
    except ValueError as e:
        return error_response(detail=str(e), status_code=404, code="NOT_FOUND")


@router.delete("/{pedido_id}")
def cancel_pedido(
    pedido_id: int,
    body: CancelPedidoRequest,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Cancelar propio pedido (solo PENDIENTE o CONFIRMADO)."""
    try:
        pedido = service.get_pedido_by_id(session, pedido_id)
        if not pedido:
            return error_response(detail="Pedido no encontrado", status_code=404, code="NOT_FOUND")

        cancelled = service.cancel_pedido(session, pedido, current_user, body.motivo)
        return success_response(
            data=PedidoRead.model_validate(cancelled),
            message="Pedido cancelado",
        )
    except BusinessRuleError as e:
        return error_response(detail=e.detail, status_code=e.status_code, code=e.code, field=e.field)
    except PermissionError as e:
        return error_response(detail=str(e), status_code=403, code="FORBIDDEN")
    except ValueError as e:
        return error_response(detail=str(e), status_code=400, code="CANCEL_NOT_ALLOWED")
