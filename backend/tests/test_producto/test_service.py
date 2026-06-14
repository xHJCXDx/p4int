"""Tests para la capa de servicio de productos."""

import pytest
from app.modules.productos.schema import ProductoCreate, ProductoUpdate
from app.modules.categorias.schema import CategoriaCreate
from app.modules.productos import service as producto_service
from app.modules.categorias import service as categoria_service


def test_create_producto_basico(session):
    """Crear un producto con campos mínimos."""
    prod_data = ProductoCreate(
        nombre="Hamburguesa",
        descripcion="Hamburguesa clásica",
        precio_base=500.0,
    )
    producto = producto_service.create(session, prod_data)

    assert producto.id is not None
    assert producto.nombre == "Hamburguesa"
    assert producto.precio_base == 500.0
    assert producto.imagenes_url is None


def test_create_producto_con_imagenes(session):
    """Crear un producto con múltiples imágenes."""
    imagenes = [
        "http://example.com/img1.jpg",
        "http://example.com/img2.jpg",
        "http://example.com/img3.jpg"
    ]
    prod_data = ProductoCreate(
        nombre="Pizza",
        descripcion="Pizza de mozzarella",
        precio_base=800.0,
        imagenes_url=imagenes,
    )
    producto = producto_service.create(session, prod_data)

    assert len(producto.imagenes_url) == 3
    assert producto.imagenes_url == imagenes


def test_create_producto_con_categorias(session):
    """Crear un producto y asignarle categorías."""
    # Crear 2 categorías
    cat1_data = CategoriaCreate(nombre="Comidas Rápidas", descripcion="Fast food")
    cat1 = categoria_service.create(session, cat1_data)
    session.refresh(cat1)

    cat2_data = CategoriaCreate(nombre="Hamburguesas", descripcion="Solo hamburguesas")
    cat2 = categoria_service.create(session, cat2_data)
    session.refresh(cat2)

    # Crear producto con esas categorías
    prod_data = ProductoCreate(
        nombre="Hamburguesa Doble",
        descripcion="Con dos carnes",
        precio_base=900.0,
        categoria_ids=[cat1.id, cat2.id]
    )
    producto = producto_service.create(session, prod_data)
    session.refresh(producto)

    assert len(producto.categorias) == 2
    assert cat1 in producto.categorias
    assert cat2 in producto.categorias


def test_create_producto_categoria_inexistente(session):
    """Si se envía un categoria_id inexistente, se ignora silenciosamente."""
    prod_data = ProductoCreate(
        nombre="Tacos",
        descripcion="Tacos al pastor",
        precio_base=600.0,
        categoria_ids=[999]  # ID que no existe
    )
    producto = producto_service.create(session, prod_data)
    session.refresh(producto)

    # El producto se crea, pero sin categorías
    assert producto.id is not None
    assert len(producto.categorias) == 0


def test_get_all_productos_paginado(session):
    """Obtener productos con paginación."""
    # Crear 5 productos
    for i in range(5):
        prod_data = ProductoCreate(
            nombre=f"Producto {i}",
            descripcion=f"Descripción {i}",
            precio_base=100.0 * (i + 1)
        )
        producto_service.create(session, prod_data)

    # Primera página: limit=3
    productos, total = producto_service.get_all(session, limit=3, offset=0)
    assert len(productos) == 3
    assert total == 5

    # Segunda página
    productos_page2, total = producto_service.get_all(session, limit=3, offset=3)
    assert len(productos_page2) == 2
    assert total == 5


def test_get_by_id_existente(session):
    """Obtener producto existente por ID."""
    prod_data = ProductoCreate(
        nombre="Ceviche",
        descripcion="Ceviche fresco",
        precio_base=350.0
    )
    created = producto_service.create(session, prod_data)
    session.refresh(created)

    retrieved = producto_service.get_by_id(session, created.id)

    assert retrieved is not None
    assert retrieved.id == created.id
    assert retrieved.nombre == "Ceviche"


def test_get_by_id_no_existente(session):
    """Obtener producto inexistente retorna None."""
    result = producto_service.get_by_id(session, 999)
    assert result is None


def test_update_producto(session):
    """Actualizar campos de un producto."""
    prod_data = ProductoCreate(
        nombre="Original",
        descripcion="Descripción original",
        precio_base=100.0,
    )
    created = producto_service.create(session, prod_data)
    session.refresh(created)

    # Actualizar
    update_data = ProductoUpdate(
        nombre="Actualizado",
        precio_base=150.0,
    )
    updated = producto_service.update(session, created, update_data)
    session.refresh(updated)

    assert updated.nombre == "Actualizado"
    assert updated.precio_base == 150.0


def test_update_producto_categorias(session):
    """Actualizar categorías de un producto (reemplazo)."""
    # Crear categorías
    cat1_data = CategoriaCreate(nombre="Cat1", descripcion="Categoría 1")
    cat1 = categoria_service.create(session, cat1_data)
    session.refresh(cat1)

    cat2_data = CategoriaCreate(nombre="Cat2", descripcion="Categoría 2")
    cat2 = categoria_service.create(session, cat2_data)
    session.refresh(cat2)

    cat3_data = CategoriaCreate(nombre="Cat3", descripcion="Categoría 3")
    cat3 = categoria_service.create(session, cat3_data)
    session.refresh(cat3)

    # Crear producto con cat1 y cat2
    prod_data = ProductoCreate(
        nombre="Producto",
        descripcion="Desc",
        precio_base=100.0,
        categoria_ids=[cat1.id, cat2.id]
    )
    producto = producto_service.create(session, prod_data)
    session.refresh(producto)

    assert len(producto.categorias) == 2

    # Actualizar a solo cat3 (reemplaza)
    update_data = ProductoUpdate(categoria_ids=[cat3.id])
    updated = producto_service.update(session, producto, update_data)
    session.refresh(updated)

    assert len(updated.categorias) == 1
    assert cat3 in updated.categorias
    assert cat1 not in updated.categorias


def test_delete_producto_soft_delete(session):
    """Eliminar un producto (soft delete)."""
    prod_data = ProductoCreate(nombre="Para eliminar", descripcion="Será eliminado", precio_base=100.0)
    created = producto_service.create(session, prod_data)
    session.refresh(created)

    assert created.deleted_at is None

    producto_service.delete(session, created)
    session.refresh(created)

    assert created.deleted_at is not None


def test_deleted_producto_invisible(session):
    """Después de soft delete, get_by_id retorna None."""
    prod_data = ProductoCreate(nombre="Será invisible", descripcion="Soft deleted", precio_base=100.0)
    created = producto_service.create(session, prod_data)
    session.refresh(created)

    producto_service.delete(session, created)

    # Después del delete, get_by_id debe retornar None
    result = producto_service.get_by_id(session, created.id)
    assert result is None
