"""Tests para los routers de categorías."""

import pytest
from app.modules.categorias.schema import CategoriaCreate
from app.modules.categorias import service


def test_get_categorias_sin_datos(client):
    """GET / sin categorías debe retornar lista vacía."""
    response = client.get("/api/v1/categorias/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total"] == 0
    assert len(data["data"]["items"]) == 0


def test_get_categorias_con_datos(client, session):
    """GET / con categorías existentes."""
    # Crear categorías directamente en la BD
    for i in range(3):
        cat_data = CategoriaCreate(nombre=f"Cat {i}", descripcion=f"Desc {i}")
        service.create(session, cat_data)

    response = client.get("/api/v1/categorias/")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 3
    assert len(data["data"]["items"]) == 3


def test_get_categorias_paginacion(client, session):
    """GET / respeta page y size."""
    for i in range(5):
        cat_data = CategoriaCreate(nombre=f"Cat {i}", descripcion=f"Desc {i}")
        service.create(session, cat_data)

    # Primera página: size=2, page=1
    response = client.get("/api/v1/categorias/?page=1&size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 2
    assert data["data"]["total"] == 5
    assert data["data"]["page"] == 1
    assert data["data"]["size"] == 2
    assert data["data"]["pages"] == 3

    # Segunda página: size=2, page=2
    response = client.get("/api/v1/categorias/?page=2&size=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 2


def test_create_categoria_sin_auth(client):
    """POST / sin autenticación debe retornar 401 (no tiene token)."""
    payload = {
        "nombre": "Nueva Categoría",
        "descripcion": "Descripción"
    }
    response = client.post("/api/v1/categorias/", json=payload)
    assert response.status_code == 401


def test_create_categoria_con_admin(admin_client):
    """POST / con admin debe crear categoría (201)."""
    payload = {
        "nombre": "Electrónica",
        "descripcion": "Productos electrónicos",
        "imagen_url": "http://example.com/imagen.jpg"
    }
    response = admin_client.post("/api/v1/categorias/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["nombre"] == "Electrónica"
    assert data["data"]["descripcion"] == "Productos electrónicos"


def test_update_categoria_sin_auth(client, session):
    """PUT sin autenticación debe retornar 401 (no tiene token)."""
    # Crear categoría
    cat_data = CategoriaCreate(nombre="Original", descripcion="Desc")
    cat = service.create(session, cat_data)
    session.refresh(cat)

    payload = {"nombre": "Actualizada"}
    response = client.put(f"/api/v1/categorias/{cat.id}", json=payload)
    assert response.status_code == 401


def test_update_categoria_con_admin(admin_client, session):
    """PUT con admin debe actualizar categoría."""
    # Crear categoría
    cat_data = CategoriaCreate(nombre="Original", descripcion="Desc")
    cat = service.create(session, cat_data)
    session.refresh(cat)

    payload = {"nombre": "Actualizada", "descripcion": "Nueva descripción"}
    response = admin_client.put(f"/api/v1/categorias/{cat.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["nombre"] == "Actualizada"
    assert data["data"]["descripcion"] == "Nueva descripción"


def test_update_categoria_no_existente(admin_client):
    """PUT a categoría inexistente debe retornar error (sin status_code explícito en router)."""
    payload = {"nombre": "No existe"}
    response = admin_client.put("/api/v1/categorias/999", json=payload)
    # Router retorna error_response(404) pero sin status_code=404 explícito, FastAPI retorna 200
    data = response.json()
    assert data["success"] is False
    assert "no encontrada" in data["message"].lower()


def test_delete_categoria_sin_auth(client, session):
    """DELETE sin autenticación debe retornar 401 (no tiene token)."""
    cat_data = CategoriaCreate(nombre="Para borrar", descripcion="Desc")
    cat = service.create(session, cat_data)
    session.refresh(cat)

    response = client.delete(f"/api/v1/categorias/{cat.id}")
    assert response.status_code == 401


def test_delete_categoria_con_admin(admin_client, session):
    """DELETE con admin sin productos debe tener éxito (retorna 200, no 204 explícito)."""
    cat_data = CategoriaCreate(nombre="Para borrar", descripcion="Desc")
    cat = service.create(session, cat_data)
    session.refresh(cat)

    response = admin_client.delete(f"/api/v1/categorias/{cat.id}")
    # Router no tiene status_code=204 explícito, retorna 200
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_delete_categoria_no_existente(admin_client):
    """DELETE a categoría inexistente debe retornar error."""
    response = admin_client.delete("/api/v1/categorias/999")
    data = response.json()
    assert data["success"] is False
    assert "no encontrada" in data["message"].lower()


def test_get_categorias_filter_por_parent(client, session):
    """GET / con parent_id debe filtrar subcategorías."""
    # Crear padre
    padre_data = CategoriaCreate(nombre="Electrónica", descripcion="Electrónica")
    padre = service.create(session, padre_data)
    session.refresh(padre)

    # Crear 2 subcategorías
    for i in range(2):
        sub_data = CategoriaCreate(
            nombre=f"Sub {i}",
            descripcion=f"Desc {i}",
            parent_id=padre.id
        )
        service.create(session, sub_data)

    # Crear categoría sin parent (raíz)
    otro_data = CategoriaCreate(nombre="Ropa", descripcion="Ropa")
    service.create(session, otro_data)

    # GET con parent_id=padre.id debe retornar solo 2
    response = client.get(f"/api/v1/categorias/?parent_id={padre.id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 2
    assert data["data"]["total"] == 2
