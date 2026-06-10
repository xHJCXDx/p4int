"""Router para Direcciones de Entrega."""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import get_current_user
from app.modules.direcciones.schema import DireccionCreate, DireccionRead, DireccionUpdate
from app.modules.direcciones.model import DireccionEntrega
from app.modules.usuarios.model import Usuario
from app.modules.direcciones import service

router = APIRouter(prefix="/api/v1/direcciones", tags=["Direcciones"])


@router.get("/")
def get_mis_direcciones(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
) -> ApiResponse:
    """Obtiene todas las direcciones del usuario autenticado."""
    direcciones, total = service.get_direcciones_by_usuario(session, current_user.id, limit, offset)

    return success_response(
        data={
            "items": [DireccionRead.model_validate(d) for d in direcciones],
            "total": total,
            "limit": limit,
            "offset": offset
        },
        message="Direcciones obtenidas"
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
def crear_direccion(
    data: DireccionCreate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    """Crea una nueva dirección para el usuario autenticado."""
    try:
        nueva_direccion = service.create_direccion(session, current_user.id, data)
        return success_response(
            data=DireccionRead.model_validate(nueva_direccion),
            message="Dirección creada",
            status_code=201
        )
    except Exception as e:
        return error_response(message=f"Error: {str(e)}", status_code=400)


@router.put("/{direccion_id}")
def actualizar_direccion(
    direccion_id: int,
    data: DireccionUpdate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    """Actualiza una dirección del usuario autenticado."""
    try:
        direccion = service.get_direccion_for_user(session, direccion_id, current_user.id)
        actualizada = service.update_direccion(session, direccion, data)
        return success_response(
            data=DireccionRead.model_validate(actualizada),
            message="Dirección actualizada"
        )
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=404)
    except Exception as e:
        return error_response(message=f"Error: {str(e)}", status_code=400)


@router.delete("/{direccion_id}")
def eliminar_direccion(
    direccion_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    """Elimina una dirección del usuario autenticado."""
    try:
        direccion = service.get_direccion_for_user(session, direccion_id, current_user.id)
        service.delete_direccion(session, direccion)
        return success_response(message="Dirección eliminada", status_code=204)
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=404)


@router.patch("/{direccion_id}/principal")
def marcar_principal(
    direccion_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
) -> ApiResponse:
    """Marca una dirección como principal (solo una por usuario)."""
    try:
        direccion = service.get_direccion_for_user(session, direccion_id, current_user.id)
        actualizada = service.update_direccion(session, direccion, DireccionUpdate(es_principal=True))
        return success_response(
            data=DireccionRead.model_validate(actualizada),
            message="Dirección marcada como principal"
        )
    except PermissionError as e:
        return error_response(message=str(e), status_code=403)
    except ValueError as e:
        return error_response(message=str(e), status_code=404)
    except Exception as e:
        return error_response(message=f"Error: {str(e)}", status_code=400)
