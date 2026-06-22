from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.auth.dependencies import require_roles
from backend.modules.auth.models import Rol, Usuario
from backend.modules.productos.schemas import (
    CategoriaBasicRead,
    ProductoCategoriaAssign,
    ProductoCreate,
    ProductoDisponibilidadUpdate,
    ProductoPaginatedResponse,
    ProductoRead,
    ProductoReadFull,
    ProductoImagenesUpdate,
    ImagenUploadResponse,
    ProductoEstadoUpdate,
    ProductoStockUpdate,
    ProductoUpdate,
)
from backend.modules.productos.services import ProductoService
from backend.modules.uploads.services import UploadService

router = APIRouter(prefix="/productos", tags=["productos"])


def get_producto_service(session: Session = Depends(get_session)) -> ProductoService:
    return ProductoService(session)


def get_upload_service() -> UploadService:
    return UploadService()


@router.post("/upload-imagen", response_model=ImagenUploadResponse, status_code=201)
async def upload_imagen_producto(
    file: UploadFile = File(...),
    svc: UploadService = Depends(get_upload_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return await svc.upload_producto_imagen(file)


@router.post("", response_model=ProductoRead, status_code=201)
def create_producto(
    producto: ProductoCreate,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.create(producto)


@router.get("", response_model=ProductoPaginatedResponse)
def list_productos(
    categoria_id: Optional[int] = Query(default=None, ge=1, description="Filtrar por categoria"),
    subcategoria_id: Optional[int] = Query(default=None, ge=1, description="Filtrar por subcategoria"),
    ingrediente_id: Optional[int] = Query(default=None, ge=1, description="Filtrar por ingrediente"),
    ingrediente_ids: list[int] = Query(default=[], description="Filtrar por multiples ingredientes"),
    disponible: Optional[bool] = Query(default=None, description="Filtrar por disponibilidad"),
    is_active: Optional[bool] = Query(default=None, description="Filtrar por estado"),
    sort_by: Optional[str] = Query(default=None, description="Orden: nombre|precio|stock"),
    sort_dir: str = Query(default="asc", description="Direccion: asc|desc"),
    search: Optional[str] = Query(default=None, max_length=100, description="Busqueda por nombre o descripcion"),
    include_inactive: bool = Query(default=False, description="Incluir productos inactivos/eliminados logicamente"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    svc: ProductoService = Depends(get_producto_service),
):
    return svc.get_all(
        categoria_id=categoria_id,
        subcategoria_id=subcategoria_id,
        ingrediente_id=ingrediente_id,
        ingrediente_ids=ingrediente_ids,
        disponible=disponible,
        is_active=is_active,
        sort_by=sort_by,
        sort_dir=sort_dir,
        search=search,
        include_inactive=include_inactive,
        offset=offset,
        limit=limit,
    )


@router.get("/{producto_id}", response_model=ProductoReadFull)
def get_producto(
    producto_id: int,
    svc: ProductoService = Depends(get_producto_service),
):
    return svc.get_by_id(producto_id)


@router.patch("/{producto_id}", response_model=ProductoRead)
def update_producto(
    producto_id: int,
    data: ProductoUpdate,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.update(producto_id, data)


@router.put("/{producto_id}", response_model=ProductoRead)
def replace_producto(
    producto_id: int,
    data: ProductoUpdate,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.update(producto_id, data)


@router.patch("/{producto_id}/imagenes", response_model=ProductoRead)
def update_producto_imagenes(
    producto_id: int,
    data: ProductoImagenesUpdate,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.update(producto_id, ProductoUpdate(imagenes_url=data.imagenes_url))


@router.patch("/{producto_id}/disponibilidad", response_model=ProductoRead)
def set_disponibilidad(
    producto_id: int,
    body: ProductoDisponibilidadUpdate,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN, Rol.STOCK)),
):
    return svc.set_disponibilidad(producto_id, body.disponible)


@router.patch(
    "/{producto_id}/stock",
    response_model=ProductoRead,
    deprecated=True,
    summary="Deprecated: stock de producto manual ignorado",
    description=(
        "Endpoint legado mantenido por compatibilidad. No modifica la disponibilidad: "
        "el stock vendible se calcula exclusivamente desde ingredientes/receta."
    ),
)
def set_stock(
    producto_id: int,
    body: ProductoStockUpdate,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN, Rol.STOCK)),
):
    return svc.set_stock(producto_id, body.stock_cantidad)


@router.delete("/{producto_id}", status_code=204)
def delete_producto(
    producto_id: int,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    svc.soft_delete(producto_id)


@router.delete("/{producto_id}/hard", status_code=204)
def hard_delete_producto(
    producto_id: int,
    svc: ProductoService = Depends(get_producto_service),
    current_user: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    svc.hard_delete(producto_id, actor_email=current_user.email)


@router.patch("/{producto_id}/estado", response_model=ProductoRead)
def set_estado_producto(
    producto_id: int,
    body: ProductoEstadoUpdate,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.set_activo(producto_id, body.is_active)


@router.post("/{producto_id}/categorias", response_model=ProductoReadFull)
def assign_to_categoria(
    producto_id: int,
    body: ProductoCategoriaAssign,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.add_to_categoria(producto_id, body.categoria_id, body.es_principal)


@router.delete("/{producto_id}/categorias/{categoria_id}", response_model=ProductoReadFull)
def remove_from_categoria(
    producto_id: int,
    categoria_id: int,
    svc: ProductoService = Depends(get_producto_service),
    _: Usuario = Depends(require_roles(Rol.ADMIN)),
):
    return svc.remove_from_categoria(producto_id, categoria_id)


@router.get("/{producto_id}/categorias", response_model=List[CategoriaBasicRead])
def get_producto_categorias(
    producto_id: int,
    svc: ProductoService = Depends(get_producto_service),
):
    return svc.get_producto_categorias(producto_id)
