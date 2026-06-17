from typing import List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, timezone
from sqlmodel import Session
from app.modules.productos.model import Producto
from app.modules.productos.schema import ProductoCreate, ProductoUpdate, ProductoRead, IngredienteInProducto, IngredienteEnReceta
from app.modules.productos.unit_of_work import ProductoUnitOfWork
from app.core.constants import convertir_unidad


def calcular_stock_producto(uow, producto: Producto) -> int:
    """Calcula cuántas unidades del producto se pueden fabricar con el stock actual de ingredientes."""
    links = uow.productos.get_ingrediente_links(producto.id)
    if not links:
        return 0

    um_cache: dict[int, str] = {}

    def _get_um_codigo(um_id: int) -> str:
        if um_id not in um_cache:
            um = uow.unidades_medida.get_by_id(um_id)
            um_cache[um_id] = um.codigo if um else "u"
        return um_cache[um_id]

    min_units = float("inf")
    for link in links:
        ingrediente = uow.ingredientes.get_by_id(link.ingrediente_id)
        if not ingrediente:
            return 0
        codigo_receta = _get_um_codigo(link.unidad_medida_id)
        codigo_stock = _get_um_codigo(ingrediente.unidad_medida_id) if ingrediente.unidad_medida_id else codigo_receta
        try:
            necesario = convertir_unidad(link.cantidad, codigo_receta, codigo_stock)
        except ValueError:
            return 0
        if necesario <= 0:
            continue
        min_units = min(min_units, float(ingrediente.stock_cantidad / necesario))

    return int(min_units) if min_units != float("inf") else 0


def _build_producto_read(uow, producto: Producto) -> ProductoRead:
    """Construye un ProductoRead con ingredientes detallados y stock calculado."""
    links = uow.productos.get_ingrediente_links(producto.id)

    um_cache: dict[int, str] = {}

    def _get_um_simbolo(um_id: int) -> str:
        if um_id not in um_cache:
            um = uow.unidades_medida.get_by_id(um_id)
            um_cache[um_id] = um.simbolo if um else ""
        return um_cache[um_id]

    ingredientes_read = []
    for link in links:
        ingrediente = uow.ingredientes.get_by_id(link.ingrediente_id)
        if ingrediente:
            ingredientes_read.append(IngredienteInProducto(
                id=ingrediente.id,
                nombre=ingrediente.nombre,
                es_alergeno=ingrediente.es_alergeno,
                cantidad=link.cantidad,
                unidad_medida_id=link.unidad_medida_id,
                unidad_medida_simbolo=_get_um_simbolo(link.unidad_medida_id),
                es_removible=link.es_removible,
            ))

    return ProductoRead(
        id=producto.id,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        precio_base=producto.precio_base,
        imagenes_url=producto.imagenes_url,
        unidad_venta_id=producto.unidad_venta_id,
        stock_cantidad=calcular_stock_producto(uow, producto),
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
        return _build_producto_read(uow, producto)


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
        items = [_build_producto_read(uow, p) for p in productos]
        if disponible:
            items = [p for p in items if p.stock_cantidad > 0]
            total = len(items)
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
        producto_dict.pop("stock_cantidad", None)
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

        producto_dict.pop("stock_cantidad", None)
        producto_dict["updated_at"] = datetime.now(timezone.utc)

        updated = uow.productos.update(db_producto, producto_dict, categoria_ids, ingredientes_data)
        uow.productos.refresh(updated)
    return updated


def delete(session: Session, db_producto: Producto):
    with ProductoUnitOfWork(session) as uow:
        uow.productos.delete(db_producto)


def update_disponibilidad(session: Session, db_producto: Producto, disponible: bool) -> Producto:
    with ProductoUnitOfWork(session) as uow:
        if disponible and calcular_stock_producto(uow, db_producto) <= 0:
            from app.core.response import BusinessRuleError
            raise BusinessRuleError("No se puede habilitar un producto sin stock de ingredientes")
        updated = uow.productos.update(db_producto, {
            "disponible": disponible,
            "updated_at": datetime.now(timezone.utc),
        })
        uow.productos.refresh(updated)
    return updated


def update_imagenes(session: Session, db_producto: Producto, imagenes_url: list[str]) -> Producto:
    with ProductoUnitOfWork(session) as uow:
        updated = uow.productos.update(db_producto, {
            "imagenes_url": imagenes_url,
            "updated_at": datetime.now(timezone.utc),
        })
        uow.productos.refresh(updated)
    return updated


def get_ingredientes(session: Session, producto_id: int) -> list[IngredienteInProducto]:
    with ProductoUnitOfWork(session) as uow:
        links = uow.productos.get_ingrediente_links(producto_id)
        um_cache: dict[int, str] = {}
        result = []
        for link in links:
            ingrediente = uow.ingredientes.get_by_id(link.ingrediente_id)
            if ingrediente:
                if link.unidad_medida_id not in um_cache:
                    um = uow.unidades_medida.get_by_id(link.unidad_medida_id)
                    um_cache[link.unidad_medida_id] = um.simbolo if um else ""
                result.append(IngredienteInProducto(
                    id=ingrediente.id,
                    nombre=ingrediente.nombre,
                    es_alergeno=ingrediente.es_alergeno,
                    cantidad=link.cantidad,
                    unidad_medida_id=link.unidad_medida_id,
                    unidad_medida_simbolo=um_cache[link.unidad_medida_id],
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
            unidad_medida_id=ing_data.unidad_medida_id,
            es_removible=ing_data.es_removible,
        )

        uow.productos.update(db_producto, {"updated_at": datetime.now(timezone.utc)})

    with ProductoUnitOfWork(session) as uow2:
        um = uow2.unidades_medida.get_by_id(ing_data.unidad_medida_id)

    return IngredienteInProducto(
        id=ingrediente.id,
        nombre=ingrediente.nombre,
        es_alergeno=ingrediente.es_alergeno,
        cantidad=ing_data.cantidad,
        unidad_medida_id=ing_data.unidad_medida_id,
        unidad_medida_simbolo=um.simbolo if um else "",
        es_removible=ing_data.es_removible,
    )
