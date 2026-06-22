from datetime import datetime
from decimal import Decimal
import logging
from typing import List, Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from backend.core.links import (
    ProductoCategoriaLink,
    ProductoIngredienteLink,
)
from backend.core.unit_of_work import UnitOfWork
from backend.modules.categorias.models import Categoria
from backend.modules.ingredientes.models import Ingrediente
from backend.modules.productos.models import Producto
from backend.modules.productos.schemas import (
    CategoriaBasicRead,
    IngredienteBasicRead,
    ProductoCreate,
    ProductoPaginatedResponse,
    ProductoRead,
    ProductoReadFull,
    ProductoUpdate,
)

logger = logging.getLogger(__name__)

class ProductoService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _get_or_404(self, uow: UnitOfWork, producto_id: int) -> Producto:
        producto = uow.productos.get_by_id(producto_id)
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto con id={producto_id} no encontrado",
            )
        return producto

    def _get_any_or_404(self, uow: UnitOfWork, producto_id: int) -> Producto:
        producto = uow.productos.get_by_id_any(producto_id)
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto con id={producto_id} no encontrado",
            )
        return producto

    def _get_categoria_or_404(self, uow: UnitOfWork, categoria_id: int) -> Categoria:
        categoria = uow.categorias.get_by_id(categoria_id)
        if not categoria or categoria.deleted_at is not None or not categoria.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoria con id={categoria_id} no encontrada",
            )
        return categoria

    def _get_ingrediente_or_404(self, uow: UnitOfWork, ingrediente_id: int) -> Ingrediente:
        ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
        if not ingrediente or ingrediente.deleted_at is not None or not ingrediente.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ingrediente con id={ingrediente_id} no encontrado",
            )
        return ingrediente

    def _calcular_stock_producto(self, uow: UnitOfWork, producto_id: int) -> int:
        links = uow.productos.get_ingrediente_links(producto_id)
        if not links:
            return 0

        stocks_posibles: list[int] = []
        for link in links:
            cantidad_requerida = Decimal(link.cantidad)
            if cantidad_requerida <= 0:
                return 0

            ingrediente = uow.ingredientes.get_by_id(link.ingrediente_id)
            if not ingrediente or not ingrediente.is_active or ingrediente.deleted_at is not None:
                return 0

            stocks_posibles.append(int(Decimal(ingrediente.stock_cantidad) / cantidad_requerida))

        return min(stocks_posibles) if stocks_posibles else 0

    def _serialize_read(self, uow: UnitOfWork, producto: Producto) -> ProductoRead:
        return ProductoRead(
            id=producto.id,
            nombre=producto.nombre,
            descripcion=producto.descripcion,
            precio_base=producto.precio_base,
            imagenes_url=producto.imagenes_url or [],
            unidad_venta_id=producto.unidad_venta_id,
            stock_cantidad=self._calcular_stock_producto(uow, producto.id),
            disponible=producto.disponible,
            is_active=producto.is_active,
        )

    def _serialize_full(self, uow: UnitOfWork, producto: Producto) -> ProductoReadFull:
        categoria_links = {
            link.categoria_id: link.es_principal
            for link in uow.productos.get_categoria_links(producto.id)
        }
        ingrediente_links = {
            link.ingrediente_id: link.es_removible
            for link in uow.productos.get_ingrediente_links(producto.id)
        }
        ingrediente_cantidades = {
            (link.producto_id, link.ingrediente_id): link.cantidad
            for link in uow.productos.get_ingrediente_links(producto.id)
        }
        ingrediente_unidades = {
            (link.producto_id, link.ingrediente_id): link.unidad_medida_id
            for link in uow.productos.get_ingrediente_links(producto.id)
        }

        categorias = [
            CategoriaBasicRead(
                id=categoria.id,
                nombre=categoria.nombre,
                es_principal=bool(categoria_links.get(categoria.id, False)),
            )
            for categoria in producto.categorias
            if categoria.deleted_at is None and categoria.is_active
        ]

        ingredientes = [
            IngredienteBasicRead(
                id=ingrediente.id,
                nombre=ingrediente.nombre,
                es_alergeno=ingrediente.es_alergeno,
                unidad_medida=ingrediente.unidad.simbolo if ingrediente.unidad else "ud",
                unidad_medida_id=ingrediente_unidades.get((producto.id, ingrediente.id))
                or ingrediente.unidad_medida_id,
                es_removible=bool(ingrediente_links.get(ingrediente.id, False)),
                cantidad=ingrediente_cantidades.get((producto.id, ingrediente.id), Decimal("1")),
            )
            for ingrediente in producto.ingredientes
            if ingrediente.deleted_at is None and ingrediente.is_active
        ]

        return ProductoReadFull(
            id=producto.id,
            nombre=producto.nombre,
            descripcion=producto.descripcion,
            precio_base=producto.precio_base,
            imagenes_url=producto.imagenes_url or [],
            unidad_venta_id=producto.unidad_venta_id,
            stock_cantidad=self._calcular_stock_producto(uow, producto.id),
            disponible=producto.disponible,
            is_active=producto.is_active,
            categorias=categorias,
            ingredientes=ingredientes,
        )

    def create(self, data: ProductoCreate) -> ProductoRead:
        with UnitOfWork(self._session) as uow:
            base_payload = data.model_dump(exclude={"categorias", "ingredientes", "stock_cantidad"})
            producto = Producto.model_validate(base_payload)
            receta: list[tuple[Ingrediente, Decimal]] = []
            categorias_payload: list[tuple[int, bool]] = []
            ingredientes_payload: list[tuple[int, bool, Decimal, int]] = []

            for categoria in data.categorias:
                if categoria.categoria_id is None:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="categoria_id requerido",
                    )
                self._get_categoria_or_404(uow, categoria.categoria_id)
                categorias_payload.append((categoria.categoria_id, bool(categoria.es_principal)))

            if not categorias_payload:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Debe enviarse al menos una categoria",
                )

            for ingrediente in data.ingredientes:
                if ingrediente.ingrediente_id is None:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="ingrediente_id requerido",
                    )
                ingrediente_model = self._get_ingrediente_or_404(uow, ingrediente.ingrediente_id)
                cantidad = Decimal(ingrediente.cantidad)
                receta.append((ingrediente_model, cantidad))
                unidad_medida_id = ingrediente.unidad_medida_id or ingrediente_model.unidad_medida_id
                if unidad_medida_id is None:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="El ingrediente debe tener unidad_medida_id para armar la receta",
                    )
                ingredientes_payload.append(
                    (ingrediente.ingrediente_id, bool(ingrediente.es_removible), cantidad, unidad_medida_id)
                )

            uow.productos.add(producto)
            uow.flush()

            for categoria_id, es_principal in categorias_payload:
                uow.productos.add_relation(
                    ProductoCategoriaLink(
                        producto_id=producto.id,
                        categoria_id=categoria_id,
                        es_principal=es_principal,
                    )
                )

            for ingrediente_id, es_removible, cantidad, unidad_medida_id in ingredientes_payload:
                uow.productos.add_relation(
                    ProductoIngredienteLink(
                        producto_id=producto.id,
                        ingrediente_id=ingrediente_id,
                        es_removible=es_removible,
                        cantidad=cantidad,
                        unidad_medida_id=unidad_medida_id,
                    )
                )

            uow.flush()
            uow.refresh(producto)
            result = self._serialize_read(uow, producto)
        return result

    def get_all(
        self,
        *,
        categoria_id: Optional[int] = None,
        subcategoria_id: Optional[int] = None,
        ingrediente_id: Optional[int] = None,
        ingrediente_ids: list[int] | None = None,
        disponible: Optional[bool] = None,
        is_active: Optional[bool] = None,
        sort_by: Optional[str] = None,
        sort_dir: str = "asc",
        search: Optional[str] = None,
        offset: int = 0,
        limit: int = 10,
        include_inactive: bool = False,
    ) -> ProductoPaginatedResponse:
        with UnitOfWork(self._session) as uow:
            total, productos = uow.productos.get_paginated(
                offset=offset,
                limit=limit,
                categoria_id=categoria_id,
                subcategoria_id=subcategoria_id,
                ingrediente_id=ingrediente_id,
                ingrediente_ids=ingrediente_ids or [],
                disponible=disponible,
                is_active=is_active,
                sort_by=sort_by,
                sort_dir=sort_dir,
                search=search,
                include_inactive=include_inactive,
            )
            items = [self._serialize_full(uow, producto) for producto in productos]
        return ProductoPaginatedResponse(total=total, items=items)

    def get_by_id(self, producto_id: int) -> ProductoReadFull:
        with UnitOfWork(self._session) as uow:
            producto = self._get_or_404(uow, producto_id)
            result = self._serialize_full(uow, producto)
        return result

    def update(self, producto_id: int, data: ProductoUpdate) -> ProductoRead:
        with UnitOfWork(self._session) as uow:
            producto = self._get_or_404(uow, producto_id)
            patch = data.model_dump(exclude_unset=True)

            categorias_patch = patch.pop("categorias", None)
            ingredientes_patch = patch.pop("ingredientes", None)
            patch.pop("stock_cantidad", None)

            for field, value in patch.items():
                setattr(producto, field, value)
            producto.updated_at = datetime.utcnow()
            uow.productos.add(producto)

            if categorias_patch is not None:
                existing = uow.productos.get_categoria_links(producto.id)
                for link in existing:
                    uow.productos.delete_relation(link)
                for categoria in categorias_patch:
                    self._get_categoria_or_404(uow, categoria["categoria_id"])
                    uow.productos.add_relation(
                        ProductoCategoriaLink(
                            producto_id=producto.id,
                            categoria_id=categoria["categoria_id"],
                            es_principal=categoria.get("es_principal", False),
                        )
                    )

            if ingredientes_patch is not None:
                existing = uow.productos.get_ingrediente_links(producto.id)
                for link in existing:
                    uow.productos.delete_relation(link)
                for ingrediente in ingredientes_patch:
                    ingrediente_model = self._get_ingrediente_or_404(uow, ingrediente["ingrediente_id"])
                    unidad_medida_id = ingrediente.get("unidad_medida_id") or ingrediente_model.unidad_medida_id
                    if unidad_medida_id is None:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="El ingrediente debe tener unidad_medida_id para armar la receta",
                        )
                    uow.productos.add_relation(
                        ProductoIngredienteLink(
                            producto_id=producto.id,
                            ingrediente_id=ingrediente["ingrediente_id"],
                            es_removible=ingrediente.get("es_removible", False),
                            cantidad=Decimal(str(ingrediente.get("cantidad", 1))),
                            unidad_medida_id=unidad_medida_id,
                        )
                    )

            uow.flush()
            uow.refresh(producto)
            result = self._serialize_read(uow, producto)
        return result

    def set_disponibilidad(self, producto_id: int, disponible: bool) -> ProductoRead:
        with UnitOfWork(self._session) as uow:
            producto = self._get_or_404(uow, producto_id)
            producto.disponible = disponible
            producto.updated_at = datetime.utcnow()
            uow.productos.add(producto)
            uow.flush()
            uow.refresh(producto)
            result = self._serialize_read(uow, producto)
        return result

    def soft_delete(self, producto_id: int) -> None:
        self.set_activo(producto_id, False)

    def set_activo(self, producto_id: int, is_active: bool) -> ProductoRead:
        with UnitOfWork(self._session) as uow:
            producto = self._get_any_or_404(uow, producto_id)
            now = datetime.utcnow()
            producto.is_active = is_active
            producto.deleted_at = None if is_active else now
            producto.updated_at = now
            uow.productos.add(producto)
            uow.flush()
            uow.refresh(producto)
            return self._serialize_read(uow, producto)

    def set_stock(self, producto_id: int, stock_cantidad: int) -> ProductoRead:
        with UnitOfWork(self._session) as uow:
            producto = self._get_or_404(uow, producto_id)
            return self._serialize_read(uow, producto)

    def hard_delete(self, producto_id: int, actor_email: str | None = None) -> None:
        with UnitOfWork(self._session) as uow:
            producto = self._get_any_or_404(uow, producto_id)

            if producto.is_active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Para eliminar definitivamente, primero desactiva el producto (soft delete).",
                )

            if uow.productos.has_order_details(producto_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="No se puede eliminar definitivamente: el producto tiene historial en pedidos.",
                )

            categoria_links = uow.productos.get_categoria_links(producto_id)
            for link in categoria_links:
                uow.productos.delete_relation(link)

            ingrediente_links = uow.productos.get_ingrediente_links(producto_id)
            for link in ingrediente_links:
                uow.productos.delete_relation(link)

            producto_nombre = producto.nombre
            uow.productos.delete(producto)
            logger.info(
                "AUDIT hard_delete_producto actor=%s producto_id=%s producto_nombre=%s",
                actor_email or "unknown",
                producto_id,
                producto_nombre,
            )

    def add_to_categoria(
        self,
        producto_id: int,
        categoria_id: int,
        es_principal: bool = False,
    ) -> ProductoReadFull:
        with UnitOfWork(self._session) as uow:
            producto = self._get_or_404(uow, producto_id)
            self._get_categoria_or_404(uow, categoria_id)

            link = uow.productos.get_categoria_link(producto_id, categoria_id)
            if link is None:
                uow.productos.add_relation(
                    ProductoCategoriaLink(
                        producto_id=producto_id,
                        categoria_id=categoria_id,
                        es_principal=es_principal,
                    )
                )
            else:
                link.es_principal = es_principal
                uow.productos.add_relation(link)

            uow.flush()
            uow.refresh(producto)
            result = self._serialize_full(uow, producto)
        return result

    def remove_from_categoria(self, producto_id: int, categoria_id: int) -> ProductoReadFull:
        with UnitOfWork(self._session) as uow:
            producto = self._get_or_404(uow, producto_id)
            link = uow.productos.get_categoria_link(producto_id, categoria_id)
            if link is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Relacion producto-categoria no encontrada",
                )

            uow.productos.delete_relation(link)
            uow.flush()
            uow.refresh(producto)
            result = self._serialize_full(uow, producto)
        return result

    def get_producto_categorias(self, producto_id: int) -> List[CategoriaBasicRead]:
        with UnitOfWork(self._session) as uow:
            producto = self._get_or_404(uow, producto_id)
            categoria_links = {
                link.categoria_id: link.es_principal
                for link in uow.productos.get_categoria_links(producto.id)
            }

            result = [
                CategoriaBasicRead(
                    id=categoria.id,
                    nombre=categoria.nombre,
                    es_principal=bool(categoria_links.get(categoria.id, False)),
                )
                for categoria in producto.categorias
                if categoria.deleted_at is None and categoria.is_active
            ]
        return result
