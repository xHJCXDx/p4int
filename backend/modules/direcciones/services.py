from datetime import datetime

from fastapi import HTTPException, status
from sqlmodel import Session

from backend.core.unit_of_work import UnitOfWork
from backend.modules.direcciones.models import DireccionEntrega
from backend.modules.direcciones.schemas import (
    DireccionEntregaCreate,
    DireccionEntregaRead,
    DireccionEntregaUpdate,
)


class DireccionEntregaService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _get_or_404(self, uow: UnitOfWork, direccion_id: int, usuario_id: int) -> DireccionEntrega:
        d = uow.direcciones.get_by_id(direccion_id)
        if not d:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dirección con id={direccion_id} no encontrada",
            )
        if d.usuario_id != usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés acceso a esta dirección",
            )
        return d

    def create(self, usuario_id: int, data: DireccionEntregaCreate) -> DireccionEntregaRead:
        with UnitOfWork(self._session) as uow:
            direccion = DireccionEntrega(usuario_id=usuario_id, **data.model_dump())
            uow.direcciones.add(direccion)
            result = DireccionEntregaRead.model_validate(direccion)
        return result

    def get_all(self, usuario_id: int) -> list[DireccionEntregaRead]:
        with UnitOfWork(self._session) as uow:
            dirs = uow.direcciones.get_all_by_usuario(usuario_id)
            result = [DireccionEntregaRead.model_validate(d) for d in dirs]
        return result

    def get_by_id(self, usuario_id: int, direccion_id: int) -> DireccionEntregaRead:
        with UnitOfWork(self._session) as uow:
            d = self._get_or_404(uow, direccion_id, usuario_id)
            result = DireccionEntregaRead.model_validate(d)
        return result

    def update(self, usuario_id: int, direccion_id: int, data: DireccionEntregaUpdate) -> DireccionEntregaRead:
        with UnitOfWork(self._session) as uow:
            d = self._get_or_404(uow, direccion_id, usuario_id)
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(d, field, value)
            d.updated_at = datetime.utcnow()
            result = DireccionEntregaRead.model_validate(d)
        return result

    def set_principal(self, usuario_id: int, direccion_id: int) -> DireccionEntregaRead:
        with UnitOfWork(self._session) as uow:
            d = self._get_or_404(uow, direccion_id, usuario_id)
            uow.direcciones.unset_all_principal(usuario_id)
            d.es_principal = True
            d.updated_at = datetime.utcnow()
            result = DireccionEntregaRead.model_validate(d)
        return result

    def soft_delete(self, usuario_id: int, direccion_id: int) -> None:
        with UnitOfWork(self._session) as uow:
            d = self._get_or_404(uow, direccion_id, usuario_id)
            now = datetime.utcnow()
            d.deleted_at = now
            d.updated_at = now
