from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.admin.schemas import (
    RolAssignRequest,
    UsuarioAdminPaginatedResponse,
    UsuarioAdminRead,
    UsuarioAdminUpdate,
)
from backend.modules.admin.services import AdminUsuarioService
from backend.modules.auth.dependencies import require_roles
from backend.modules.auth.models import Rol, Usuario

router = APIRouter(prefix="/admin", tags=["admin"])


def get_service(session: Session = Depends(get_session)) -> AdminUsuarioService:
    return AdminUsuarioService(session)


@router.get("/usuarios", response_model=UsuarioAdminPaginatedResponse)
def list_usuarios(
    rol: Annotated[
        Optional[str],
        Query(description="Filtrar por rol: ADMIN, STOCK, PEDIDOS o CLIENT"),
    ] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
    svc: AdminUsuarioService = Depends(get_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.list_usuarios(rol=rol, offset=offset, limit=limit)


@router.get("/usuarios/{usuario_id}", response_model=UsuarioAdminRead)
def get_usuario(
    usuario_id: int,
    svc: AdminUsuarioService = Depends(get_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.get_by_id(usuario_id)


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioAdminRead)
def update_usuario(
    usuario_id: int,
    data: UsuarioAdminUpdate,
    svc: AdminUsuarioService = Depends(get_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.update(usuario_id, data)


@router.patch("/usuarios/{usuario_id}/rol", response_model=UsuarioAdminRead)
def assign_rol(
    usuario_id: int,
    data: RolAssignRequest,
    svc: AdminUsuarioService = Depends(get_service),
    current_admin: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.assign_rol(usuario_id, data, current_admin)


@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_usuario(
    usuario_id: int,
    svc: AdminUsuarioService = Depends(get_service),
    current_admin: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    svc.soft_delete(usuario_id, current_admin)
