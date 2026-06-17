from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, paginated_response, error_response, paginate_offset, ApiResponse
from app.core.security import require_roles
from app.core.constants import RolCode
from app.modules.categorias.schema import CategoriaCreate, CategoriaRead, CategoriaUpdate, CategoriaWithChildren, CategoriaImagenUpdate
from app.modules.categorias import service

router = APIRouter(prefix="/api/v1/categorias", tags=["Categorias"])


@router.get("/")
def read_categorias(
    session: Session = Depends(get_session),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(10, ge=1, le=100, description="Elementos por página"),
    parent_id: Optional[int] = Query(None, description="Filtrar por categoría padre")
) -> ApiResponse:
    items, total = service.get_all_as_read(session, size, paginate_offset(page, size), parent_id=parent_id)

    return paginated_response(
        items=items,
        total=total,
        page=page,
        size=size,
        message="Categorías obtenidas exitosamente",
    )

@router.get("/tree")
def read_categorias_tree(session: Session = Depends(get_session)) -> ApiResponse:
    """Árbol jerárquico completo de categorías (recursive CTE)."""
    tree = service.get_tree(session)
    return success_response(data=tree, message="Árbol de categorías obtenido exitosamente")


@router.get("/{categoria_id}")
def read_categoria(categoria_id: int, session: Session = Depends(get_session)) -> ApiResponse:
    """Obtener categoría por ID con sus hijos directos (público)."""
    categoria = service.get_categoria_by_id(session, categoria_id)
    if not categoria:
        return error_response(detail="Categoría no encontrada", status_code=404, code="NOT_FOUND")
    return success_response(data=categoria, message="Categoría obtenida exitosamente")


@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(RolCode.ADMIN))])
def create_categoria(categoria: CategoriaCreate, session: Session = Depends(get_session)) -> ApiResponse:
    """Crear categoría (solo ADMIN)."""
    new_categoria = service.create(session, categoria)
    return success_response(
        data=service.build_categoria_read(session, new_categoria),
        message="Categoría creada exitosamente",
        status_code=201
    )

@router.put("/{categoria_id}", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def update_categoria(categoria_id: int, categoria: CategoriaUpdate, session: Session = Depends(get_session)) -> ApiResponse:
    """Actualizar categoría (solo ADMIN)."""
    db_categoria = service.get_by_id(session, categoria_id)
    if not db_categoria:
        return error_response(detail="Categoría no encontrada", status_code=404, code="NOT_FOUND")
    updated_categoria = service.update(session, db_categoria, categoria)
    return success_response(
        data=service.build_categoria_read(session, updated_categoria),
        message="Categoría actualizada exitosamente"
    )

@router.patch("/{categoria_id}/imagen", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def update_categoria_imagen(
    categoria_id: int,
    data: CategoriaImagenUpdate,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Actualizar imagen de una categoría (solo ADMIN)."""
    db_categoria = service.get_by_id(session, categoria_id)
    if not db_categoria:
        return error_response(detail="Categoría no encontrada", status_code=404, code="NOT_FOUND")
    updated = service.update(session, db_categoria, CategoriaUpdate(imagen_url=data.imagen_url))
    return success_response(
        data=service.build_categoria_read(session, updated),
        message="Imagen de categoría actualizada"
    )


@router.delete("/{categoria_id}", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def delete_categoria(categoria_id: int, session: Session = Depends(get_session)) -> ApiResponse:
    """Eliminar categoría (soft delete, solo ADMIN). No se puede eliminar si tiene productos activos."""
    db_categoria = service.get_by_id(session, categoria_id)
    if not db_categoria:
        return error_response(detail="Categoría no encontrada", status_code=404, code="NOT_FOUND")

    error = service.delete(session, db_categoria)
    if error:
        return error_response(detail=error, status_code=409, code="CATEGORIA_CON_PRODUCTOS")

    return success_response(
        message="Categoría eliminada exitosamente",
        status_code=204
    )
