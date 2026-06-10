"""Service para DireccionEntrega."""

from typing import Tuple, List, Optional
from datetime import datetime
from sqlmodel import Session
from app.modules.direcciones.model import DireccionEntrega
from app.modules.direcciones.schema import DireccionCreate, DireccionUpdate
from app.modules.direcciones.unit_of_work import DireccionEntregaUnitOfWork


def get_direcciones_by_usuario(session: Session, usuario_id: int, limit: int = 10, offset: int = 0) -> Tuple[List[DireccionEntrega], int]:
    """Obtiene todas las direcciones de un usuario con paginación."""
    with DireccionEntregaUnitOfWork(session) as uow:
        return uow.direcciones.get_by_usuario(usuario_id, limit, offset)


def get_direccion_by_id(session: Session, direccion_id: int) -> Optional[DireccionEntrega]:
    """Obtiene una dirección por ID."""
    with DireccionEntregaUnitOfWork(session) as uow:
        return uow.direcciones.get_by_id(direccion_id)


def get_direccion_for_user(session: Session, direccion_id: int, usuario_id: int) -> DireccionEntrega:
    """Obtiene una dirección verificando que pertenezca al usuario."""
    with DireccionEntregaUnitOfWork(session) as uow:
        direccion = uow.direcciones.get_by_id(direccion_id)
        if not direccion:
            raise ValueError("Dirección no encontrada")
        if direccion.usuario_id != usuario_id:
            raise PermissionError("No tienes permiso")
        return direccion


def create_direccion(session: Session, usuario_id: int, data: DireccionCreate) -> DireccionEntrega:
    """Crea una nueva dirección de entrega."""
    with DireccionEntregaUnitOfWork(session) as uow:
        if data.es_principal:
            principal_actual = uow.direcciones.get_principal(usuario_id)
            if principal_actual:
                uow.direcciones.update(principal_actual, {"es_principal": False})

        nueva_direccion = DireccionEntrega(
            usuario_id=usuario_id,
            alias=data.alias,
            linea1=data.linea1,
            linea2=data.linea2,
            ciudad=data.ciudad,
            provincia=data.provincia,
            codigo_postal=data.codigo_postal,
            latitud=data.latitud,
            longitud=data.longitud,
            es_principal=data.es_principal
        )
        uow.direcciones.create(nueva_direccion)
        uow.direcciones.refresh(nueva_direccion)
    return nueva_direccion


def update_direccion(session: Session, direccion: DireccionEntrega, data: DireccionUpdate) -> DireccionEntrega:
    """Actualiza una dirección."""
    with DireccionEntregaUnitOfWork(session) as uow:
        if data.es_principal and not direccion.es_principal:
            principal_actual = uow.direcciones.get_principal(direccion.usuario_id)
            if principal_actual:
                uow.direcciones.update(principal_actual, {"es_principal": False})

        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        uow.direcciones.update(direccion, update_dict)
        uow.direcciones.refresh(direccion)
    return direccion


def delete_direccion(session: Session, direccion: DireccionEntrega) -> None:
    """Soft delete de una dirección."""
    with DireccionEntregaUnitOfWork(session) as uow:
        uow.direcciones.delete(direccion)
