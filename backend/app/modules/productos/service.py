from typing import List, Optional, Tuple
from datetime import datetime
from sqlmodel import Session
from app.modules.productos.model import Producto
from app.modules.productos.schema import ProductoCreate, ProductoUpdate, ProductoRead, IngredienteInProducto, IngredienteEnReceta
from app.modules.productos.unit_of_work import ProductoUnitOfWork


def _build_producto_read(producto_repo, ingrediente_repo, producto: Producto) -> ProductoRead:
    """Construye un ProductoRead con ingredientes detallados."""
    links = producto_repo.get_ingrediente_links(producto.id)

    ingredientes_read = []
    for link in links:
        ingrediente = ingrediente_repo.get_by_id(link.ingrediente_id)
        if ingrediente:
            ingredientes_read.append(IngredienteInProducto(
                id=ingrediente.id,
                nombre=ingrediente.nombre,
                es_alergeno=ingrediente.es_alergeno,
                cantidad=link.cantidad,
                unidad_medida_codigo=link.unidad_medida_codigo,
                es_removible=link.es_removible,
            ))

    return ProductoRead(
        id=producto.id,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        precio_base=producto.precio_base,
        imagenes_url=producto.imagenes_url,
        unidad_venta_codigo=producto.unidad_venta_codigo,
        stock_cantidad=producto.stock_cantidad,
        disponible=producto.disponible,
        created_at=producto.created_at,
        updated_at=producto.updated_at,
        deleted_at=producto.deleted_at,
        categorias=producto.categorias,
        ingredientes=ingredientes_read,
    )


def build_producto_read(session: Session, producto: Producto) -> ProductoRead:
    """Wrapper público para construir ProductoRead."""
    with ProductoUnitOfWork(session) as uow:
        return _build_producto_read(uow.productos, uow.ingredientes, producto)


def get_all(
    session: Session,
    limit: int = 100,
    offset: int = 0,
    busqueda: Optional[str] = None,
    categoria_id: Optional[int] = None,
    disponible: Optional[bool] = None,
) -> Tuple[List[ProductoRead], int]:
    with ProductoUnitOfWork(session) as uow:
        productos, total = uow.productos.get_all(
            limit, offset,
            busqueda=busqueda,
            categoria_id=categoria_id,
            disponible=disponible,
        )
        items = [_build_producto_read(uow.productos, uow.ingredientes, p) for p in productos]
        return items, total


def get_by_id(session: Session, producto_id: int) -> Optional[Producto]:
    with ProductoUnitOfWork(session) as uow:
        return uow.productos.get_by_id(producto_id)


def get_by_id_with_relations(session: Session, producto_id: int) -> Optional[Producto]:
    with ProductoUnitOfWork(session) as uow:
        return uow.productos.get_by_id_with_relations(producto_id)


def create(session: Session, producto_data: ProductoCreate) -> Producto:
    with ProductoUnitOfWork(session) as uow:
        ingredientes_data = producto_data.ingredientes
        producto_dict = producto_data.model_dump(exclude={"categoria_ids", "ingredientes"})
        db_producto = Producto(**producto_dict)
        producto = uow.productos.create(db_producto, producto_data.categoria_ids, ingredientes_data)
        uow.productos.refresh(producto)
    return producto


def update(session: Session, db_producto: Producto, producto_data: ProductoUpdate) -> Producto:
    with ProductoUnitOfWork(session) as uow:
        producto_dict = producto_data.model_dump(exclude_unset=True)

        categoria_ids = producto_dict.pop("categoria_ids", None)
        ingredientes_raw = producto_dict.pop("ingredientes", None)

        ingredientes_data = None
        if ingredientes_raw is not None:
            ingredientes_data = [
                IngredienteEnReceta(**ing) if isinstance(ing, dict) else ing
                for ing in ingredientes_raw
            ]

        producto_dict["updated_at"] = datetime.utcnow()

        updated = uow.productos.update(db_producto, producto_dict, categoria_ids, ingredientes_data)
        uow.productos.refresh(updated)
    return updated


def delete(session: Session, db_producto: Producto):
    with ProductoUnitOfWork(session) as uow:
        uow.productos.delete(db_producto)


def update_disponibilidad(session: Session, db_producto: Producto, disponible: bool) -> Producto:
    with ProductoUnitOfWork(session) as uow:
        updated = uow.productos.update(db_producto, {
            "disponible": disponible,
            "updated_at": datetime.utcnow(),
        })
        uow.productos.refresh(updated)
    return updated


def update_imagenes(session: Session, db_producto: Producto, imagenes_url: list[str]) -> Producto:
    with ProductoUnitOfWork(session) as uow:
        updated = uow.productos.update(db_producto, {
            "imagenes_url": imagenes_url,
            "updated_at": datetime.utcnow(),
        })
        uow.productos.refresh(updated)
    return updated


def get_ingredientes(session: Session, producto_id: int) -> list[IngredienteInProducto]:
    with ProductoUnitOfWork(session) as uow:
        links = uow.productos.get_ingrediente_links(producto_id)
        result = []
        for link in links:
            ingrediente = uow.ingredientes.get_by_id(link.ingrediente_id)
            if ingrediente:
                result.append(IngredienteInProducto(
                    id=ingrediente.id,
                    nombre=ingrediente.nombre,
                    es_alergeno=ingrediente.es_alergeno,
                    cantidad=link.cantidad,
                    unidad_medida_codigo=link.unidad_medida_codigo,
                    es_removible=link.es_removible,
                ))
        return result


def add_ingrediente(session: Session, db_producto: Producto, ing_data: IngredienteEnReceta) -> IngredienteInProducto:
    with ProductoUnitOfWork(session) as uow:
        ingrediente = uow.ingredientes.get_by_id(ing_data.ingrediente_id)
        if not ingrediente:
            raise ValueError(f"Ingrediente {ing_data.ingrediente_id} no encontrado")

        uow.productos.create_ingrediente_link(
            db_producto.id,
            ing_data.ingrediente_id,
            cantidad=ing_data.cantidad,
            unidad_medida_codigo=ing_data.unidad_medida_codigo,
            es_removible=ing_data.es_removible,
        )

        uow.productos.update(db_producto, {"updated_at": datetime.utcnow()})

    return IngredienteInProducto(
        id=ingrediente.id,
        nombre=ingrediente.nombre,
        es_alergeno=ingrediente.es_alergeno,
        cantidad=ing_data.cantidad,
        unidad_medida_codigo=ing_data.unidad_medida_codigo,
        es_removible=ing_data.es_removible,
    )
