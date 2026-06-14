"""Tests para los routers de ingredientes."""

import pytest
from app.modules.ingredientes.schema import IngredienteCreate
from app.modules.ingredientes import service


def test_get_ingredientes_sin_datos(client):
    """GET / sin ingredientes debe retornar lista vacía."""
    response = client.get("/api/v1/ingredientes/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total"] == 0
    assert len(data["data"]["items"]) == 0


def test_get_ingredientes_con_datos(client, session):
    """GET / con ingredientes existentes."""
    for i in range(4):
        ing_data = IngredienteCreate(nombre=f"Ingrediente {i}", es_alergeno=i % 2 == 0)
        service.create(session, ing_data)

    response = client.get("/api/v1/ingredientes/")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 4
    assert len(data["data"]["items"]) == 4


def test_get_ingredientes_paginacion(client, session):
    """GET / respeta page y size."""
    for i in range(6):
        ing_data = IngredienteCreate(nombre=f"Ing {i}", es_alergeno=False)
        service.create(session, ing_data)

    # Primera página: size=3, page=1
    response = client.get("/api/v1/ingredientes/?page=1&size=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 3
    assert data["data"]["total"] == 6
    assert data["data"]["page"] == 1
    assert data["data"]["size"] == 3
    assert data["data"]["pages"] == 2

    # Segunda página: size=3, page=2
    response = client.get("/api/v1/ingredientes/?page=2&size=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 3


def test_create_ingrediente_sin_auth(client):
    """POST / sin autenticación debe retornar 401 (no tiene token)."""
    payload = {
        "nombre": "Miel",
        "descripcion": "Miel pura",
        "es_alergeno": False
    }
    response = client.post("/api/v1/ingredientes/", json=payload)
    assert response.status_code == 401


def test_create_ingrediente_con_admin(admin_client):
    """POST / con admin debe crear ingrediente (201)."""
    payload = {
        "nombre": "Ajo",
        "descripcion": "Ajo fresco",
        "es_alergeno": False
    }
    response = admin_client.post("/api/v1/ingredientes/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["nombre"] == "Ajo"
    assert data["data"]["descripcion"] == "Ajo fresco"
    assert data["data"]["es_alergeno"] is False


def test_create_ingrediente_alergeno_con_admin(admin_client):
    """POST con admin creando ingrediente alérgeno."""
    payload = {
        "nombre": "Camarones",
        "descripcion": "Camarones frescos",
        "es_alergeno": True
    }
    response = admin_client.post("/api/v1/ingredientes/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["data"]["es_alergeno"] is True


def test_update_ingrediente_sin_auth(client, session):
    """PUT sin autenticación debe retornar 401 (no tiene token)."""
    ing_data = IngredienteCreate(nombre="Pimienta", es_alergeno=False)
    ing = service.create(session, ing_data)
    session.refresh(ing)

    payload = {"descripcion": "Pimienta negra"}
    response = client.put(f"/api/v1/ingredientes/{ing.id}", json=payload)
    assert response.status_code == 401


def test_update_ingrediente_con_admin(admin_client, session):
    """PUT con admin debe actualizar ingrediente."""
    ing_data = IngredienteCreate(nombre="Azúcar", descripcion="Azúcar blanca", es_alergeno=False)
    ing = service.create(session, ing_data)
    session.refresh(ing)

    payload = {"descripcion": "Azúcar morena", "es_alergeno": True}
    response = admin_client.put(f"/api/v1/ingredientes/{ing.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["descripcion"] == "Azúcar morena"
    assert data["data"]["es_alergeno"] is True


def test_update_ingrediente_no_existente(admin_client):
    """PUT a ingrediente inexistente debe retornar error."""
    payload = {"descripcion": "No existe"}
    response = admin_client.put("/api/v1/ingredientes/999", json=payload)
    data = response.json()
    assert data["code"] == "NOT_FOUND"
    assert "no encontrado" in data["detail"].lower()


def test_delete_ingrediente_sin_auth(client, session):
    """DELETE sin autenticación debe retornar 401 (no tiene token)."""
    ing_data = IngredienteCreate(nombre="Para borrar", es_alergeno=False)
    ing = service.create(session, ing_data)
    session.refresh(ing)

    response = client.delete(f"/api/v1/ingredientes/{ing.id}")
    assert response.status_code == 401


def test_delete_ingrediente_con_admin(admin_client, session):
    """DELETE con admin debe eliminar ingrediente (retorna 200, no 204 explícito)."""
    ing_data = IngredienteCreate(nombre="Para eliminar", es_alergeno=False)
    ing = service.create(session, ing_data)
    session.refresh(ing)

    response = admin_client.delete(f"/api/v1/ingredientes/{ing.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_delete_ingrediente_no_existente(admin_client):
    """DELETE a ingrediente inexistente debe retornar error."""
    response = admin_client.delete("/api/v1/ingredientes/999")
    data = response.json()
    assert data["code"] == "NOT_FOUND"
    assert "no encontrado" in data["detail"].lower()
