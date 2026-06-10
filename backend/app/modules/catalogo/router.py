from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import require_roles
from app.modules.catalogo.schema import UnidadMedidaCreate
from app.modules.catalogo import service

router = APIRouter(prefix="/api/v1/catalogo", tags=["Catálogos"])


@router.get("/unidades-medida")
def read_unidades_medida(session: Session = Depends(get_session)) -> ApiResponse:
    """Listado de unidades de medida."""
    unidades = service.get_all_unidades_medida(session)
    return success_response(
        data=[{"codigo": u.codigo, "nombre": u.nombre, "simbolo": u.simbolo, "tipo": u.tipo} for u in unidades],
        message="Unidades de medida obtenidas"
    )


@router.post("/unidades-medida", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("ADMIN", "STOCK"))])
def create_unidad_medida(data: UnidadMedidaCreate, session: Session = Depends(get_session)) -> ApiResponse:
    """Crear unidad de medida (ADMIN o STOCK)."""
    nueva = service.create_unidad_medida(session, data)
    if not nueva:
        return error_response(message=f"La unidad '{data.codigo}' ya existe", status_code=400)
    return success_response(
        data={"codigo": nueva.codigo, "nombre": nueva.nombre, "simbolo": nueva.simbolo, "tipo": nueva.tipo},
        message="Unidad de medida creada",
        status_code=201
    )


@router.delete("/unidades-medida/{codigo}", dependencies=[Depends(require_roles("ADMIN", "STOCK"))])
def delete_unidad_medida(codigo: str, session: Session = Depends(get_session)) -> ApiResponse:
    """Eliminar unidad de medida (ADMIN o STOCK)."""
    error = service.delete_unidad_medida(session, codigo)
    if error:
        status_code = 404 if "no encontrada" in error else 400
        return error_response(message=error, status_code=status_code)
    return success_response(message="Unidad de medida eliminada")


# --- Formas de Pago ---

@router.get("/formas-pago")
def read_formas_pago(session: Session = Depends(get_session)) -> ApiResponse:
    """Listado de formas de pago."""
    formas = service.get_all_formas_pago(session)
    return success_response(
        data=[{"codigo": f.codigo, "descripcion": f.descripcion, "habilitado": f.habilitado} for f in formas],
        message="Formas de pago obtenidas",
    )


# --- Estados de Pedido ---

@router.get("/estados-pedido")
def read_estados_pedido(session: Session = Depends(get_session)) -> ApiResponse:
    """Listado de estados de pedido."""
    estados = service.get_all_estados_pedido(session)
    return success_response(
        data=[{"codigo": e.codigo, "descripcion": e.descripcion, "orden": e.orden, "es_terminal": e.es_terminal} for e in estados],
        message="Estados de pedido obtenidos",
    )
