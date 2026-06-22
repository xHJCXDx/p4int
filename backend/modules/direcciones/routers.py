from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.auth.dependencies import get_current_user
from backend.modules.auth.models import Usuario
from backend.modules.direcciones.schemas import (
    DireccionEntregaCreate,
    DireccionEntregaRead,
    DireccionEntregaUpdate,
)
from backend.modules.direcciones.services import DireccionEntregaService

router = APIRouter(prefix="/direcciones", tags=["direcciones"])


def get_service(session: Session = Depends(get_session)) -> DireccionEntregaService:
    return DireccionEntregaService(session)


@router.post("", response_model=DireccionEntregaRead, status_code=status.HTTP_201_CREATED)
def create_direccion(
    data: DireccionEntregaCreate,
    svc: DireccionEntregaService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.create(current_user.id, data)


@router.get("", response_model=list[DireccionEntregaRead])
def list_direcciones(
    svc: DireccionEntregaService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.get_all(current_user.id)


@router.get("/{direccion_id}", response_model=DireccionEntregaRead)
def get_direccion(
    direccion_id: int,
    svc: DireccionEntregaService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.get_by_id(current_user.id, direccion_id)


@router.patch("/{direccion_id}", response_model=DireccionEntregaRead)
def update_direccion(
    direccion_id: int,
    data: DireccionEntregaUpdate,
    svc: DireccionEntregaService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.update(current_user.id, direccion_id, data)


@router.patch("/{direccion_id}/principal", response_model=DireccionEntregaRead)
def set_principal(
    direccion_id: int,
    svc: DireccionEntregaService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    return svc.set_principal(current_user.id, direccion_id)


@router.delete("/{direccion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_direccion(
    direccion_id: int,
    svc: DireccionEntregaService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    svc.soft_delete(current_user.id, direccion_id)
