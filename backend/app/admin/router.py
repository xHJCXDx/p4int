from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, paginated_response, error_response, ApiResponse
from app.core.security import require_roles
from app.core.constants import RolCode
from app.modules.usuarios.schema import UsuarioUpdate
from app.modules.usuarios import service as usuario_service
from app.modules.usuarios.service import usuario_to_read
from app.admin import service as admin_service

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/stats", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def dashboard_stats(session: Session = Depends(get_session)) -> ApiResponse:
    """Estadísticas generales del sistema."""
    stats = admin_service.get_dashboard_stats(session)
    return success_response(data=stats, message="Estadísticas del sistema")


@router.get("/roles", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def listar_roles(session: Session = Depends(get_session)) -> ApiResponse:
    """Listado de roles del sistema."""
    roles = usuario_service.get_all_roles(session)
    return success_response(
        data=[{"codigo": r.codigo, "nombre": r.nombre, "descripcion": r.descripcion} for r in roles],
        message="Roles listados",
    )


@router.get("/usuarios", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def listar_usuarios(
    session: Session = Depends(get_session),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Elementos por página"),
    rol: Optional[str] = Query(None, description="Filtrar por rol")
) -> ApiResponse:
    offset = (page - 1) * size
    usuarios, total = usuario_service.get_all_paginado(session, limit=size, offset=offset, rol_codigo=rol)

    return paginated_response(
        items=[usuario_to_read(u) for u in usuarios],
        total=total,
        page=page,
        size=size,
        message="Usuarios listados",
    )


@router.put("/usuarios/{usuario_id}", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    session: Session = Depends(get_session)
) -> ApiResponse:
    usuario = usuario_service.update_user_admin(session, usuario_id, data)
    if not usuario:
        return error_response(detail="Usuario no encontrado", status_code=404, code="NOT_FOUND")

    return success_response(
        data=usuario_to_read(usuario),
        message="Usuario actualizado"
    )


@router.delete("/usuarios/{usuario_id}", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def eliminar_usuario(
    usuario_id: int,
    session: Session = Depends(get_session)
) -> ApiResponse:
    error = usuario_service.delete_user(session, usuario_id)
    if error:
        return error_response(detail=error, status_code=404, code="NOT_FOUND")

    return success_response(message="Usuario eliminado", status_code=204)


@router.post("/usuarios/{usuario_id}/roles", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def asignar_rol(
    usuario_id: int,
    rol_codigo: str = Query(...),
    session: Session = Depends(get_session)
) -> ApiResponse:
    usuario, error = usuario_service.assign_role(session, usuario_id, rol_codigo)
    if error:
        status_code = 404 if "no encontrado" in error else 400
        return error_response(detail=error, status_code=status_code, code="NOT_FOUND" if status_code == 404 else "VALIDATION_ERROR")

    return success_response(
        data=usuario_to_read(usuario),
        message="Rol asignado",
        status_code=201
    )
