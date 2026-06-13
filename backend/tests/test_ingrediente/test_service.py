"""Tests para la capa de servicio de ingredientes."""

import pytest
from app.modules.ingredientes.schema import IngredienteCreate, IngredienteUpdate
from app.modules.ingredientes import service


def test_create_ingrediente(session):
    """Crear un ingrediente y verificar que persiste."""
    ingrediente_data = IngredienteCreate(
        nombre="Tomate",
        descripcion="Tomate fresco",
        es_alergeno=False
    )
    ingrediente = service.create(session, ingrediente_data)

    assert ingrediente.id is not None
    assert ingrediente.nombre == "Tomate"
    assert ingrediente.descripcion == "Tomate fresco"
    assert ingrediente.es_alergeno is False
    assert ingrediente.created_at is not None
    assert ingrediente.updated_at is not None


def test_create_ingrediente_alergeno(session):
    """Crear un ingrediente que es alergeno."""
    ingrediente_data = IngredienteCreate(
        nombre="Maní",
        descripcion="Maní molido",
        es_alergeno=True
    )
    ingrediente = service.create(session, ingrediente_data)

    assert ingrediente.es_alergeno is True


def test_get_all_ingredientes_paginado(session):
    """Obtener ingredientes con paginación."""
    # Crear 5 ingredientes
    for i in range(5):
        ing_data = IngredienteCreate(nombre=f"Ingrediente {i}", es_alergeno=False)
        service.create(session, ing_data)

    # Obtener con limit=3
    ingredientes, total = service.get_all(session, limit=3, offset=0)
    assert len(ingredientes) == 3
    assert total == 5

    # Segunda página
    ingredientes_page2, total = service.get_all(session, limit=3, offset=3)
    assert len(ingredientes_page2) == 2
    assert total == 5


def test_get_by_id_existente(session):
    """Obtener ingrediente por ID cuando existe."""
    ing_data = IngredienteCreate(nombre="Cebolla", descripcion="Cebolla amarilla")
    created = service.create(session, ing_data)
    session.refresh(created)

    retrieved = service.get_by_id(session, created.id)

    assert retrieved is not None
    assert retrieved.id == created.id
    assert retrieved.nombre == "Cebolla"


def test_get_by_id_no_existente(session):
    """Obtener ingrediente por ID cuando no existe."""
    result = service.get_by_id(session, 999)
    assert result is None


def test_update_ingrediente(session):
    """Actualizar un ingrediente."""
    ing_data = IngredienteCreate(nombre="Sal", descripcion="Sal marina", es_alergeno=False)
    created = service.create(session, ing_data)
    session.refresh(created)

    # Actualizar
    update_data = IngredienteUpdate(descripcion="Sal gruesa", es_alergeno=False)
    updated = service.update(session, created, update_data)
    session.refresh(updated)

    assert updated.descripcion == "Sal gruesa"
    assert updated.updated_at > created.created_at


def test_update_ingrediente_nombre(session):
    """Actualizar el nombre de un ingrediente."""
    ing_data = IngredienteCreate(nombre="Original", es_alergeno=False)
    created = service.create(session, ing_data)
    session.refresh(created)

    update_data = IngredienteUpdate(nombre="Actualizado")
    updated = service.update(session, created, update_data)
    session.refresh(updated)

    assert updated.nombre == "Actualizado"


def test_delete_ingrediente(session):
    """Eliminar un ingrediente."""
    ing_data = IngredienteCreate(nombre="Para eliminar", es_alergeno=False)
    created = service.create(session, ing_data)
    session.refresh(created)

    service.delete(session, created)

    # Verificar que fue eliminado
    result = service.get_by_id(session, created.id)
    assert result is None


def test_unique_nombre_ingrediente(session):
    """Nombres de ingredientes deben ser únicos."""
    ing_data1 = IngredienteCreate(nombre="Leche", es_alergeno=True)
    service.create(session, ing_data1)

    # Intentar crear otro con mismo nombre
    ing_data2 = IngredienteCreate(nombre="Leche", es_alergeno=False)
    with pytest.raises(Exception):  # SQLModel debe lanzar excepción de constraint
        service.create(session, ing_data2)
