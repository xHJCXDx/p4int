from typing import List, Optional, Tuple
from datetime import datetime
from sqlmodel import Session
from app.modules.producto.model import Producto
from app.modules.producto.schema import ProductoCreate, ProductoUpdate, ProductoRead, IngredienteInProducto, IngredienteEnReceta
from app.modules.producto.unit_of_work import ProductoUnitOfWork


def _calcular_stock(producto_repo, ingrediente_repo, producto_id: int) -> Tuple[int, bool]:
    """
    Calcula el stock de un producto basado en los ingredientes disponibles.
    stock = min(ingrediente.stock_cantidad // cantidad_necesaria) para cada ingrediente.
    """
    links = producto_repo.get_ingrediente_links(producto_id)

    if not links:
        return 0, False

    stock = float("inf")
    for link in links:
        ingrediente = ingrediente_repo.get_by_id(link.ingrediente_id)
        if not ingrediente:
            return 0, False
        unidades_posibles = ingrediente.stock_cantidad // link.cantidad
        stock = min(stock, unidades_posibles)

    stock = int(stock) if stock != float("inf") else 0
    return stock, stock > 0


def _build_producto_read(producto_repo, ingrediente_repo, producto: Producto) -> ProductoRead:
    """Construye un ProductoRead con stock calculado e ingredientes con cantidad."""
    stock_cantidad, disponible = _calcular_stock(producto_repo, ingrediente_repo, producto.id)

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
                es_removible=link.es_removible,
            ))

    return ProductoRead(
        id=producto.id,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        precio_base=producto.precio_base,
        imagenes_url=producto.imagenes_url,
        created_at=producto.created_at,
        updated_at=producto.updated_at,
        deleted_at=producto.deleted_at,
        categorias=producto.categorias,
        ingredientes=ingredientes_read,
        stock_cantidad=stock_cantidad,
        disponible=disponible,
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
        productos, total = uow.productos.get_all(limit, offset, busqueda=busqueda, categoria_id=categoria_id)
        items = [_build_producto_read(uow.productos, uow.ingredientes, p) for p in productos]

        if disponible is not None:
            items = [p for p in items if p.disponible == disponible]

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
