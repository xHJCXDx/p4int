from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.auth.dependencies import require_roles
from backend.modules.auth.models import Rol, Usuario
from backend.modules.categorias.schemas import (
    CategoriaCreate,
    CategoriaEstadoUpdate,
    CategoriaPaginatedResponse,
    CategoriaRead,
    CategoriaReadFull,
    CategoriaUpdate,
)
from backend.modules.categorias.services import CategoriaService

router = APIRouter(prefix="/categorias", tags=["categorias"])


def get_categoria_service(session: Session = Depends(get_session)) -> CategoriaService:
    return CategoriaService(session)


@router.post("", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED)
def create_categoria(
    categoria: CategoriaCreate,
    svc: CategoriaService = Depends(get_categoria_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.create(categoria)


@router.get("", response_model=CategoriaPaginatedResponse)
def list_categorias(
    categoria_id: Optional[int] = Query(default=None, ge=1, description="Filtrar por id de categoria"),
    parent_id: Optional[int] = Query(default=None, ge=1, description="Filtrar por categoria padre"),
    is_active: Optional[bool] = Query(default=None, description="Filtrar por estado"),
    sort_by: Optional[str] = Query(default=None, description="Orden: nombre"),
    sort_dir: str = Query(default="asc", description="Direccion: asc|desc"),
    search: Optional[str] = Query(default=None, max_length=100, description="Busqueda por nombre"),
    include_inactive: bool = Query(default=False, description="Incluir categorias inactivas/eliminadas logicamente"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    svc: CategoriaService = Depends(get_categoria_service),
):
    return svc.get_all(
        parent_id=parent_id,
        categoria_id=categoria_id,
        is_active=is_active,
        sort_by=sort_by,
        sort_dir=sort_dir,
        search=search,
        include_inactive=include_inactive,
        offset=offset,
        limit=limit,
    )


@router.get("/{categoria_id}", response_model=CategoriaReadFull)
def get_categoria(
    categoria_id: int,
    svc: CategoriaService = Depends(get_categoria_service),
):
    return svc.get_by_id(categoria_id)


@router.patch("/{categoria_id}", response_model=CategoriaRead)
def update_categoria(
    categoria_id: int,
    data: CategoriaUpdate,
    svc: CategoriaService = Depends(get_categoria_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.update(categoria_id, data)


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_categoria(
    categoria_id: int,
    svc: CategoriaService = Depends(get_categoria_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.soft_delete(categoria_id)


@router.patch("/{categoria_id}/estado", response_model=CategoriaRead)
def set_estado_categoria(
    categoria_id: int,
    body: CategoriaEstadoUpdate,
    svc: CategoriaService = Depends(get_categoria_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.set_activo(categoria_id, body.is_active)


@router.delete("/{categoria_id}/hard", status_code=status.HTTP_204_NO_CONTENT)
def hard_delete_categoria(
    categoria_id: int,
    svc: CategoriaService = Depends(get_categoria_service),
    current_user: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    svc.hard_delete(categoria_id, actor_email=current_user.email)
