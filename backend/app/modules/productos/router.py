from typing import Annotated, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, paginated_response, error_response, paginate_offset, ApiResponse
from app.core.security import require_roles
from app.core.constants import RolCode
from app.modules.productos.schema import ProductoCreate, ProductoUpdate, DisponibilidadUpdate, ImagenesUpdate, IngredienteEnReceta
from app.modules.productos import service

router = APIRouter(prefix="/api/v1/productos", tags=["Productos"])

@router.get("/")
def read_productos(
    session: Session = Depends(get_session),
    page: Annotated[int, Query(ge=1, description="Número de página")] = 1,
    size: Annotated[int, Query(ge=1, le=100, description="Elementos por página")] = 10,
    categoria: Annotated[Optional[int], Query(description="Filtrar por categoría")] = None,
    disponible: Annotated[Optional[bool], Query(description="Filtrar por disponibilidad")] = None,
    search: Annotated[Optional[str], Query(description="Buscar por nombre")] = None,
) -> ApiResponse:
    """Listado público de productos con filtros: categoría, disponibilidad, búsqueda."""
    items, total = service.get_all(
        session, size, paginate_offset(page, size),
        busqueda=search,
        categoria_id=categoria,
        disponible=disponible,
    )

    return paginated_response(
        items=items,
        total=total,
        page=page,
        size=size,
        message="Productos obtenidos exitosamente",
    )

@router.get("/{producto_id}")
def read_producto(producto_id: int, session: Session = Depends(get_session)) -> ApiResponse:
    """Detalle público de un producto por ID."""
    producto = service.get_by_id_with_relations(session, producto_id)
    if not producto:
        return error_response(detail="Producto no encontrado", status_code=404, code="NOT_FOUND")
    return success_response(
        data=service.build_producto_read(session, producto),
        message="Producto obtenido exitosamente"
    )

@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(RolCode.ADMIN))])
def create_producto(producto: ProductoCreate, session: Session = Depends(get_session)) -> ApiResponse:
    """Crear producto (solo ADMIN)."""
    new_producto = service.create(session, producto)
    return success_response(
        data=service.build_producto_read(session, new_producto),
        message="Producto creado exitosamente",
        status_code=201
    )

@router.put("/{producto_id}", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def update_producto(producto_id: int, producto: ProductoUpdate, session: Session = Depends(get_session)) -> ApiResponse:
    """Actualizar producto (solo ADMIN)."""
    db_producto = service.get_by_id(session, producto_id)
    if not db_producto:
        return error_response(detail="Producto no encontrado", status_code=404, code="NOT_FOUND")
    updated_producto = service.update(session, db_producto, producto)
    return success_response(
        data=service.build_producto_read(session, updated_producto),
        message="Producto actualizado exitosamente"
    )

@router.patch("/{producto_id}/disponibilidad", dependencies=[Depends(require_roles(RolCode.ADMIN, RolCode.STOCK))])
def update_disponibilidad(producto_id: int, body: DisponibilidadUpdate, session: Session = Depends(get_session)) -> ApiResponse:
    """Cambiar disponible true/false (ADMIN o STOCK)."""
    db_producto = service.get_by_id(session, producto_id)
    if not db_producto:
        return error_response(detail="Producto no encontrado", status_code=404, code="NOT_FOUND")
    updated = service.update_disponibilidad(session, db_producto, body.disponible)
    return success_response(
        data=service.build_producto_read(session, updated),
        message="Disponibilidad actualizada"
    )


@router.patch("/{producto_id}/imagenes", dependencies=[Depends(require_roles(RolCode.ADMIN))])
def update_imagenes(producto_id: int, body: ImagenesUpdate, session: Session = Depends(get_session)) -> ApiResponse:
    """Actualizar lista imagenes_url[] del producto (solo ADMIN)."""
    db_producto = service.get_by_id(session, producto_id)
    if not db_producto:
        return error_response(detail="Producto no encontrado", status_code=404, code="NOT_FOUND")
    updated = service.update_imagenes(session, db_producto, body.imagenes_url)
    return success_response(
        data=service.build_producto_read(session, updated),
        message="Imágenes actualizadas"
    )


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(RolCode.ADMIN))])
def delete_producto(producto_id: int, session: Session = Depends(get_session)):
    """Soft delete producto (solo ADMIN)."""
    db_producto = service.get_by_id(session, producto_id)
    if not db_producto:
        return error_response(detail="Producto no encontrado", status_code=404, code="NOT_FOUND")
    service.delete(session, db_producto)


@router.get("/{producto_id}/ingredientes")
def read_producto_ingredientes(producto_id: int, session: Session = Depends(get_session)) -> ApiResponse:
    """Listar ingredientes del producto (público)."""
    db_producto = service.get_by_id(session, producto_id)
    if not db_producto:
        return error_response(detail="Producto no encontrado", status_code=404, code="NOT_FOUND")
    ingredientes = service.get_ingredientes(session, producto_id)
    return success_response(data=ingredientes, message="Ingredientes obtenidos")


@router.post("/{producto_id}/ingredientes", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(RolCode.ADMIN))])
def add_producto_ingrediente(producto_id: int, body: IngredienteEnReceta, session: Session = Depends(get_session)) -> ApiResponse:
    """Asociar ingrediente a producto con cantidad y unidad (solo ADMIN)."""
    db_producto = service.get_by_id(session, producto_id)
    if not db_producto:
        return error_response(detail="Producto no encontrado", status_code=404, code="NOT_FOUND")
    try:
        result = service.add_ingrediente(session, db_producto, body)
        return success_response(data=result, message="Ingrediente asociado", status_code=201)
    except ValueError as e:
        return error_response(detail=str(e), status_code=400, code="VALIDATION_ERROR")
