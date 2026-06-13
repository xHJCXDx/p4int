"""Tests para la capa de servicio de categorías."""

import pytest
from datetime import datetime
from app.modules.categorias.schema import CategoriaCreate, CategoriaUpdate
from app.modules.categorias import service


def test_create_categoria(session):
    """Crear una categoría y verificar que persiste."""
    categoria_data = CategoriaCreate(nombre="Electrónica", descripcion="Productos electrónicos")
    categoria = service.create(session, categoria_data)

    assert categoria.id is not None
    assert categoria.nombre == "Electrónica"
    assert categoria.descripcion == "Productos electrónicos"
    assert categoria.created_at is not None
    assert categoria.updated_at is not None


def test_get_all_categorias_paginado(session):
    """Obtener categorías con paginación."""
    # Crear 3 categorías
    for i in range(3):
        categoria_data = CategoriaCreate(nombre=f"Categoría {i}", descripcion=f"Desc {i}")
        service.create(session, categoria_data)

    # Obtener con limit=2, offset=0
    categorias, total = service.get_all(session, limit=2, offset=0)

    assert len(categorias) == 2
    assert total == 3

    # Obtener la siguiente página
    categorias_page2, total = service.get_all(session, limit=2, offset=2)
    assert len(categorias_page2) == 1
    assert total == 3


def test_get_by_id_existente(session):
    """Obtener categoría por ID cuando existe."""
    categoria_data = CategoriaCreate(nombre="Ropa", descripcion="Prendas de vestir")
    created = service.create(session, categoria_data)
    session.refresh(created)

    retrieved = service.get_by_id(session, created.id)

    assert retrieved is not None
    assert retrieved.id == created.id
    assert retrieved.nombre == "Ropa"


def test_get_by_id_no_existente(session):
    """Obtener categoría por ID cuando no existe."""
    result = service.get_by_id(session, 999)
    assert result is None


def test_update_categoria(session):
    """Actualizar una categoría."""
    categoria_data = CategoriaCreate(nombre="Original", descripcion="Descripción original")
    created = service.create(session, categoria_data)
    session.refresh(created)

    # Actualizar nombre y descripción
    update_data = CategoriaUpdate(nombre="Actualizada", descripcion="Descripción nueva")
    updated = service.update(session, created, update_data)
    session.refresh(updated)

    assert updated.nombre == "Actualizada"
    assert updated.descripcion == "Descripción nueva"
    assert updated.updated_at > created.created_at


def test_delete_categoria_soft_delete(session):
    """Eliminar categoría (soft delete) y verificar que deleted_at se setea."""
    categoria_data = CategoriaCreate(nombre="Para eliminar", descripcion="Será eliminada")
    created = service.create(session, categoria_data)
    session.refresh(created)

    assert created.deleted_at is None

    service.delete(session, created)
    session.refresh(created)

    assert created.deleted_at is not None


def test_deleted_categoria_invisible(session):
    """Después de soft delete, get_by_id devuelve None."""
    categoria_data = CategoriaCreate(nombre="Será invisible", descripcion="Soft deleted")
    created = service.create(session, categoria_data)
    session.refresh(created)

    service.delete(session, created)

    # Después de delete, get_by_id debe devolver None (soft delete)
    result = service.get_by_id(session, created.id)
    assert result is None


def test_create_subcategoria_con_parent(session):
    """Crear una subcategoría con parent_id."""
    # Crear categoría padre
    padre_data = CategoriaCreate(nombre="Electrónica", descripcion="Electrónica en general")
    padre = service.create(session, padre_data)
    session.refresh(padre)

    # Crear subcategoría
    sub_data = CategoriaCreate(
        nombre="Laptops",
        descripcion="Computadoras portátiles",
        parent_id=padre.id
    )
    sub = service.create(session, sub_data)
    session.refresh(sub)

    assert sub.parent_id == padre.id

    # Verificar que get_by_id la retorna correctamente
    retrieved = service.get_by_id(session, sub.id)
    assert retrieved.parent_id == padre.id
