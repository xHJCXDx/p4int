from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import require_roles
from app.modules.usuario.schema import UsuarioUpdate
from app.modules.usuario import service as usuario_service

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/usuarios", dependencies=[Depends(require_roles("ADMIN"))])
def listar_usuarios(
    session: Session = Depends(get_session),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    rol: Optional[str] = Query(None, description="Filtrar por rol")
) -> ApiResponse:
    usuarios, total = usuario_service.get_all_paginado(session, limit=limit, offset=offset, rol_codigo=rol)

    return success_response(
        data={
            "items": [usuario_service.usuario_to_read(u) for u in usuarios],
            "total": total,
            "limit": limit,
            "offset": offset
        },
        message="Usuarios listados"
    )


@router.put("/usuarios/{usuario_id}", dependencies=[Depends(require_roles("ADMIN"))])
def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    session: Session = Depends(get_session)
) -> ApiResponse:
    usuario = usuario_service.update_user_admin(session, usuario_id, data)
    if not usuario:
        return error_response(message="Usuario no encontrado", status_code=404)

    return success_response(
        data=usuario_service.usuario_to_read(usuario),
        message="Usuario actualizado"
    )


@router.delete("/usuarios/{usuario_id}", dependencies=[Depends(require_roles("ADMIN"))])
def eliminar_usuario(
    usuario_id: int,
    session: Session = Depends(get_session)
) -> ApiResponse:
    error = usuario_service.delete_user(session, usuario_id)
    if error:
        return error_response(message=error, status_code=404)

    return success_response(message="Usuario eliminado", status_code=204)


@router.post("/usuarios/{usuario_id}/roles", dependencies=[Depends(require_roles("ADMIN"))])
def asignar_rol(
    usuario_id: int,
    rol_codigo: str = Query(...),
    session: Session = Depends(get_session)
) -> ApiResponse:
    usuario, error = usuario_service.assign_role(session, usuario_id, rol_codigo)
    if error:
        status_code = 404 if "no encontrado" in error else 400
        return error_response(message=error, status_code=status_code)

    return success_response(
        data=usuario_service.usuario_to_read(usuario),
        message="Rol asignado",
        status_code=201
    )
