from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.auth.dependencies import require_roles
from backend.modules.auth.models import Rol, Usuario
from backend.modules.ingredientes.services import IngredienteService
from backend.modules.ingredientes.schemas import (
    IngredienteEstadoUpdate,
    IngredientePaginatedResponse,
    IngredienteCreate,
    IngredienteRead,
    IngredienteUpdate,
)

router = APIRouter(prefix="/ingredientes", tags=["ingredientes"])

def get_ingrediente_service(
    session: Session = Depends(get_session),
) -> IngredienteService:
    return IngredienteService(session)


# ─── CRUD ──────────────────────────────────────────────────────────────────

# ─── Ceate ─────────────────────────────────────────────────────────────────
@router.post("", response_model=IngredienteRead, status_code=201)
def create_ingrediente(
    ingrediente: IngredienteCreate,
    svc: IngredienteService = Depends(get_ingrediente_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.create(ingrediente)

# ─── Read ──────────────────────────────────────────────────────────────────
@router.get("", response_model=IngredientePaginatedResponse)
def list_ingredientes(
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    name: Optional[str] = None,
    es_alergeno: Optional[bool] = None,
    unidad_medida: Optional[str] = None,
    is_active: Optional[bool] = Query(default=None),
    sort_by: Optional[str] = Query(default=None, description="Orden: nombre|stock"),
    sort_dir: str = Query(default="asc", description="Direccion: asc|desc"),
    include_inactive: bool = Query(default=False),
    svc: IngredienteService = Depends(get_ingrediente_service),
):
    total, items = svc.get_paginated(
        offset=offset,
        limit=limit,
        name=name,
        es_alergeno=es_alergeno,
        unidad_medida=unidad_medida,
        is_active=is_active,
        sort_by=sort_by,
        sort_dir=sort_dir,
        include_inactive=include_inactive,
    )

    return {
        "total": total,
        "items": items,
    }


@router.get("/{ingrediente_id}", response_model=IngredienteRead)
def get_ingrediente(
    ingrediente_id: int,
    svc: IngredienteService = Depends(get_ingrediente_service),
):
    return svc.get_by_id(ingrediente_id)

# ─── Patch ─────────────────────────────────────────────────────────────────
@router.patch("/{ingrediente_id}", response_model=IngredienteRead)
def update_ingrediente(
    ingrediente_id: int,
    data: IngredienteUpdate,
    svc: IngredienteService = Depends(get_ingrediente_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.update(ingrediente_id, data)

# ─── Delete ─────────────────────────────────────────────────────────────────
@router.delete("/{ingrediente_id}", status_code=204)
def delete_ingrediente(
    ingrediente_id: int,
    svc: IngredienteService = Depends(get_ingrediente_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    svc.soft_delete(ingrediente_id)


@router.delete("/{ingrediente_id}/hard", status_code=204)
def hard_delete_ingrediente(
    ingrediente_id: int,
    svc: IngredienteService = Depends(get_ingrediente_service),
    current_user: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    svc.hard_delete(ingrediente_id, actor_email=current_user.email)


@router.patch("/{ingrediente_id}/estado", response_model=IngredienteRead)
def set_estado_ingrediente(
    ingrediente_id: int,
    body: IngredienteEstadoUpdate,
    svc: IngredienteService = Depends(get_ingrediente_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.set_activo(ingrediente_id, body.is_active)
