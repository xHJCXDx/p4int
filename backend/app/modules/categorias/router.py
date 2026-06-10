from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import require_roles
from app.modules.categorias.schema import CategoriaCreate, CategoriaRead, CategoriaUpdate
from app.modules.categorias import service

router = APIRouter(prefix="/api/v1/categorias", tags=["Categorias"])


@router.get("/")
def read_categorias(
    session: Session = Depends(get_session),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    parent_id: Optional[int] = Query(None, description="Filtrar por categoría padre")
) -> ApiResponse:
    categorias, total = service.get_all(session, limit, offset, parent_id=parent_id)

    return success_response(
        data={
            "items": [service.build_categoria_read(session, c) for c in categorias],
            "total": total,
            "limit": limit,
            "offset": offset
        },
        message="Categorías obtenidas exitosamente"
    )

@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("ADMIN"))])
def create_categoria(categoria: CategoriaCreate, session: Session = Depends(get_session)) -> ApiResponse:
    """Crear categoría (solo ADMIN)."""
    new_categoria = service.create(session, categoria)
    return success_response(
        data=service.build_categoria_read(session, new_categoria),
        message="Categoría creada exitosamente",
        status_code=201
    )

@router.put("/{categoria_id}", dependencies=[Depends(require_roles("ADMIN"))])
def update_categoria(categoria_id: int, categoria: CategoriaUpdate, session: Session = Depends(get_session)) -> ApiResponse:
    """Actualizar categoría (solo ADMIN)."""
    db_categoria = service.get_by_id(session, categoria_id)
    if not db_categoria:
        return error_response(message="Categoría no encontrada", status_code=404)
    updated_categoria = service.update(session, db_categoria, categoria)
    return success_response(
        data=service.build_categoria_read(session, updated_categoria),
        message="Categoría actualizada exitosamente"
    )

@router.delete("/{categoria_id}", dependencies=[Depends(require_roles("ADMIN"))])
def delete_categoria(categoria_id: int, session: Session = Depends(get_session)) -> ApiResponse:
    """Eliminar categoría (soft delete, solo ADMIN). No se puede eliminar si tiene productos activos."""
    db_categoria = service.get_by_id(session, categoria_id)
    if not db_categoria:
        return error_response(message="Categoría no encontrada", status_code=404)

    error = service.delete(session, db_categoria)
    if error:
        return error_response(message=error, status_code=409)

    return success_response(
        message="Categoría eliminada exitosamente",
        status_code=204
    )
