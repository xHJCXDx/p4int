from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse, BusinessRuleError
from app.core.security import require_roles
from app.core.constants import RolCode
from app.modules.catalogo.schema import UnidadMedidaCreate, UnidadMedidaRead, FormaPagoRead, EstadoPedidoRead
from app.modules.catalogo import service

router = APIRouter(prefix="/api/v1/catalogo", tags=["Catálogos"])


@router.get("/unidades-medida")
def read_unidades_medida(session: Session = Depends(get_session)) -> ApiResponse:
    """Listado de unidades de medida."""
    unidades = service.get_all_unidades_medida(session)
    return success_response(
        data=[UnidadMedidaRead.model_validate(u) for u in unidades],
        message="Unidades de medida obtenidas"
    )


@router.post("/unidades-medida", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(RolCode.ADMIN, RolCode.STOCK))])
def create_unidad_medida(data: UnidadMedidaCreate, session: Session = Depends(get_session)) -> ApiResponse:
    """Crear unidad de medida (ADMIN o STOCK)."""
    try:
        nueva = service.create_unidad_medida(session, data)
        return success_response(
            data=UnidadMedidaRead.model_validate(nueva),
            message="Unidad de medida creada",
            status_code=201
        )
    except BusinessRuleError as e:
        return error_response(detail=e.detail, status_code=e.status_code, code=e.code, field=e.field)


@router.delete("/unidades-medida/{codigo}", dependencies=[Depends(require_roles(RolCode.ADMIN, RolCode.STOCK))])
def delete_unidad_medida(codigo: str, session: Session = Depends(get_session)) -> ApiResponse:
    """Eliminar unidad de medida (ADMIN o STOCK)."""
    try:
        service.delete_unidad_medida(session, codigo)
        return success_response(message="Unidad de medida eliminada")
    except BusinessRuleError as e:
        return error_response(detail=e.detail, status_code=e.status_code, code=e.code)


# --- Formas de Pago ---

@router.get("/formas-pago")
def read_formas_pago(session: Session = Depends(get_session)) -> ApiResponse:
    """Listado de formas de pago."""
    formas = service.get_all_formas_pago(session)
    return success_response(
        data=[FormaPagoRead.model_validate(f) for f in formas],
        message="Formas de pago obtenidas",
    )


# --- Estados de Pedido ---

@router.get("/estados-pedido")
def read_estados_pedido(session: Session = Depends(get_session)) -> ApiResponse:
    """Listado de estados de pedido."""
    estados = service.get_all_estados_pedido(session)
    return success_response(
        data=[EstadoPedidoRead.model_validate(e) for e in estados],
        message="Estados de pedido obtenidos",
    )
