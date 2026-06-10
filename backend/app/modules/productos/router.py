from typing import Annotated, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import require_roles
from app.modules.productos.schema import ProductoCreate, ProductoUpdate
from app.modules.productos import service

router = APIRouter(prefix="/api/v1/productos", tags=["Productos"])

@router.get("/")
def read_productos(
    session: Session = Depends(get_session),
    limit: Annotated[int, Query(ge=1, le=100, description="Cantidad de productos por página")] = 10,
    offset: Annotated[int, Query(ge=0, description="Desplazamiento para paginación")] = 0,
    categoria_id: Annotated[Optional[int], Query(description="Filtrar por categoría")] = None,
    disponible: Annotated[Optional[bool], Query(description="Filtrar por disponibilidad")] = None,
    busqueda: Annotated[Optional[str], Query(description="Buscar por nombre")] = None,
) -> ApiResponse:
    """Listado público de productos con filtros: categoría, disponibilidad, búsqueda."""
    items, total = service.get_all(
        session, limit, offset,
        busqueda=busqueda,
        categoria_id=categoria_id,
        disponible=disponible,
    )

    return success_response(
        data={
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset
        },
        message="Productos obtenidos exitosamente"
    )

@router.get("/{producto_id}")
def read_producto(producto_id: int, session: Session = Depends(get_session)) -> ApiResponse:
    """Detalle público de un producto por ID."""
    producto = service.get_by_id_with_relations(session, producto_id)
    if not producto:
        return error_response(message="Producto no encontrado", status_code=404)
    return success_response(
        data=service.build_producto_read(session, producto),
        message="Producto obtenido exitosamente"
    )

@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles("ADMIN"))])
def create_producto(producto: ProductoCreate, session: Session = Depends(get_session)) -> ApiResponse:
    """Crear producto (solo ADMIN)."""
    new_producto = service.create(session, producto)
    return success_response(
        data=service.build_producto_read(session, new_producto),
        message="Producto creado exitosamente",
        status_code=201
    )

@router.put("/{producto_id}", dependencies=[Depends(require_roles("ADMIN"))])
def update_producto(producto_id: int, producto: ProductoUpdate, session: Session = Depends(get_session)) -> ApiResponse:
    """Actualizar producto (solo ADMIN)."""
    db_producto = service.get_by_id(session, producto_id)
    if not db_producto:
        return error_response(message="Producto no encontrado", status_code=404)
    updated_producto = service.update(session, db_producto, producto)
    return success_response(
        data=service.build_producto_read(session, updated_producto),
        message="Producto actualizado exitosamente"
    )

@router.delete("/{producto_id}", dependencies=[Depends(require_roles("ADMIN"))])
def delete_producto(producto_id: int, session: Session = Depends(get_session)) -> ApiResponse:
    """Eliminar producto (soft delete, solo ADMIN)."""
    db_producto = service.get_by_id(session, producto_id)
    if not db_producto:
        return error_response(message="Producto no encontrado", status_code=404)
    service.delete(session, db_producto)
    return success_response(
        message="Producto eliminado exitosamente",
        status_code=204
    )
