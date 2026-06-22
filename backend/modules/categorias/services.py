from datetime import datetime
import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from backend.core.unit_of_work import UnitOfWork
from backend.modules.categorias.models import Categoria
from backend.modules.categorias.schemas import (
    CategoriaCreate,
    CategoriaPaginatedResponse,
    CategoriaRead,
    CategoriaReadFull,
    CategoriaUpdate,
)

logger = logging.getLogger(__name__)


class CategoriaService:
    """Logica de negocio para categorias."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def _get_or_404(self, uow: UnitOfWork, categoria_id: int) -> Categoria:
        categoria = uow.categorias.get_by_id(categoria_id)
        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoria con id={categoria_id} no encontrada",
            )
        return categoria

    def _get_any_or_404(self, uow: UnitOfWork, categoria_id: int) -> Categoria:
        categoria = uow.categorias.get_by_id_any(categoria_id)
        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoria con id={categoria_id} no encontrada",
            )
        return categoria

    def _assert_nombre_unique(self, uow: UnitOfWork, nombre: str) -> None:
        if uow.categorias.get_by_nombre(nombre):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El nombre de categoria '{nombre}' ya esta en uso",
            )

    def _get_parent_or_404(self, uow: UnitOfWork, parent_id: int) -> Categoria:
        parent = uow.categorias.get_by_id(parent_id)
        if not parent or not parent.is_active or parent.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoria padre con id={parent_id} no encontrada",
            )
        return parent

    def _assert_no_cycle(self, uow: UnitOfWork, categoria_id: int, parent_id: int | None) -> None:
        if parent_id is None:
            return
        if parent_id == categoria_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Una categoria no puede ser su propio padre",
            )

        visited: set[int] = set()
        current = self._get_parent_or_404(uow, parent_id)
        while current.parent_id is not None:
            if current.id == categoria_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="La relacion padre genera un ciclo en el arbol de categorias",
                )
            if current.id in visited:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Se detecto un ciclo invalido en el arbol de categorias",
                )
            visited.add(current.id)
            current = self._get_parent_or_404(uow, current.parent_id)

    def create(self, data: CategoriaCreate) -> Categoria:
        with UnitOfWork(self._session) as uow:
            self._assert_nombre_unique(uow, data.nombre)
            if data.parent_id is not None:
                self._get_parent_or_404(uow, data.parent_id)

            categoria = Categoria.model_validate(data.model_dump(exclude={"parent"}))
            uow.categorias.add(categoria)
            result = Categoria.model_validate(categoria)
        return result

    def get_all(
        self,
        *,
        parent_id: Optional[int] = None,
        categoria_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        sort_by: Optional[str] = None,
        sort_dir: str = "asc",
        search: Optional[str] = None,
        offset: int = 0,
        limit: int = 10,
        include_inactive: bool = False,
    ) -> CategoriaPaginatedResponse:
        with UnitOfWork(self._session) as uow:
            total, categorias = uow.categorias.get_paginated(
                offset=offset,
                limit=limit,
                parent_id=parent_id,
                categoria_id=categoria_id,
                is_active=is_active,
                sort_by=sort_by,
                sort_dir=sort_dir,
                search=search,
                include_inactive=include_inactive,
            )
            items = [CategoriaReadFull.model_validate(c) for c in categorias]
        return CategoriaPaginatedResponse(total=total, items=items)

    def get_by_id(self, categoria_id: int) -> CategoriaReadFull:
        with UnitOfWork(self._session) as uow:
            categoria = self._get_or_404(uow, categoria_id)
            result = CategoriaReadFull.model_validate(categoria)
        return result

    def update(self, categoria_id: int, data: CategoriaUpdate) -> Categoria:
        with UnitOfWork(self._session) as uow:
            categoria = self._get_or_404(uow, categoria_id)

            if data.nombre and data.nombre != categoria.nombre:
                self._assert_nombre_unique(uow, data.nombre)

            patch = data.model_dump(exclude_unset=True)
            patch.pop("parent", None)

            next_parent_id = patch.get("parent_id", categoria.parent_id)
            self._assert_no_cycle(uow, categoria_id, next_parent_id)
            if next_parent_id is not None:
                self._get_parent_or_404(uow, next_parent_id)

            for field, value in patch.items():
                setattr(categoria, field, value)

            categoria.updated_at = datetime.utcnow()
            uow.categorias.add(categoria)
            result = CategoriaRead.model_validate(categoria)
        return result

    def soft_delete(self, categoria_id: int) -> None:
        with UnitOfWork(self._session) as uow:
            categoria = self._get_any_or_404(uow, categoria_id)
            now = datetime.utcnow()
            to_soft_delete = [categoria, *uow.categorias.get_descendants(categoria_id)]
            for item in to_soft_delete:
                item.deleted_at = now
                item.updated_at = now
                item.is_active = False
                uow.categorias.add(item)

    def set_activo(self, categoria_id: int, is_active: bool) -> CategoriaRead:
        with UnitOfWork(self._session) as uow:
            categoria = self._get_any_or_404(uow, categoria_id)
            now = datetime.utcnow()
            affected = [categoria, *uow.categorias.get_descendants(categoria_id)]

            for item in affected:
                item.is_active = is_active
                item.deleted_at = None if is_active else now
                item.updated_at = now
                uow.categorias.add(item)

            return CategoriaRead.model_validate(categoria)

    def hard_delete(self, categoria_id: int, actor_email: str | None = None) -> None:
        with UnitOfWork(self._session) as uow:
            categoria = self._get_any_or_404(uow, categoria_id)

            if categoria.is_active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Para eliminar definitivamente, primero desactiva la categoria (soft delete).",
                )

            if uow.categorias.has_children(categoria_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No se puede eliminar definitivamente: la categoria tiene subcategorias hijas.",
                )

            if uow.categorias.has_product_links(categoria_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No se puede eliminar definitivamente: la categoria tiene productos asociados.",
                )

            categoria_nombre = categoria.nombre
            uow.categorias.delete(categoria)
            logger.info(
                "AUDIT hard_delete_categoria actor=%s categoria_id=%s categoria_nombre=%s",
                actor_email or "unknown",
                categoria_id,
                categoria_nombre,
            )
