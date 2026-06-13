"""Tests para los routers de productos."""

import pytest
from app.modules.productos.schema import ProductoCreate
from app.modules.categorias.schema import CategoriaCreate
from app.modules.productos import service as producto_service
from app.modules.categorias import service as categoria_service


def test_get_productos_sin_datos(client):
    """GET / sin productos debe retornar lista vacía."""
    response = client.get("/api/v1/productos/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total"] == 0
    assert len(data["data"]["items"]) == 0


def test_get_productos_con_datos(client, session):
    """GET / con productos creados."""
    # Crear 4 productos
    for i in range(4):
        prod_data = ProductoCreate(
            nombre=f"Producto {i}",
            descripcion=f"Descripción {i}",
            precio=100.0 * (i + 1)
        )
        producto_service.create(session, prod_data)

    response = client.get("/api/v1/productos/")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 4
    assert len(data["data"]["items"]) == 4


def test_get_productos_paginacion(client, session):
    """GET / respeta page y size."""
    for i in range(6):
        prod_data = ProductoCreate(
            nombre=f"Prod {i}",
            descripcion=f"Desc {i}",
            precio=100.0
        )
        producto_service.create(session, prod_data)

    # Primera página: size=3, page=1
    response = client.get("/api/v1/productos/?page=1&size=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 3
    assert data["data"]["total"] == 6
    assert data["data"]["page"] == 1
    assert data["data"]["size"] == 3
    assert data["data"]["pages"] == 2

    # Segunda página: size=3, page=2
    response = client.get("/api/v1/productos/?page=2&size=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 3


def test_get_productos_filtro_busqueda(client, session):
    """GET / con filtro de búsqueda por nombre."""
    prod1 = ProductoCreate(nombre="Hamburguesa", descripcion="", precio=100.0)
    producto_service.create(session, prod1)

    prod2 = ProductoCreate(nombre="Hamburguesón", descripcion="", precio=100.0)
    producto_service.create(session, prod2)

    prod3 = ProductoCreate(nombre="Pizza", descripcion="", precio=100.0)
    producto_service.create(session, prod3)

    # Buscar "hamb"
    response = client.get("/api/v1/productos/?busqueda=hamb")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 2

    # Buscar "pizza"
    response = client.get("/api/v1/productos/?busqueda=pizza")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 1


def test_get_productos_filtro_categoria(client, session):
    """GET / con filtro por categoría."""
    # Crear categorías
    cat1_data = CategoriaCreate(nombre="Comidas", descripcion="")
    cat1 = categoria_service.create(session, cat1_data)
    session.refresh(cat1)

    cat2_data = CategoriaCreate(nombre="Bebidas", descripcion="")
    cat2 = categoria_service.create(session, cat2_data)
    session.refresh(cat2)

    # Crear productos: 2 en cat1, 1 en cat2
    prod1 = ProductoCreate(nombre="Hamburguesa", descripcion="", precio=100.0, categoria_ids=[cat1.id])
    producto_service.create(session, prod1)

    prod2 = ProductoCreate(nombre="Pizza", descripcion="", precio=100.0, categoria_ids=[cat1.id])
    producto_service.create(session, prod2)

    prod3 = ProductoCreate(nombre="Coca Cola", descripcion="", precio=50.0, categoria_ids=[cat2.id])
    producto_service.create(session, prod3)

    # Filtrar por cat1
    response = client.get(f"/api/v1/productos/?categoria_id={cat1.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 2

    # Filtrar por cat2
    response = client.get(f"/api/v1/productos/?categoria_id={cat2.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 1


def test_create_producto_sin_auth(client):
    """POST / sin autenticación debe retornar 401."""
    payload = {
        "nombre": "Nuevo Producto",
        "descripcion": "Descripción",
        "precio": 100.0
    }
    response = client.post("/api/v1/productos/", json=payload)
    assert response.status_code == 401


def test_create_producto_con_admin(admin_client):
    """POST / con admin debe crear producto (201)."""
    payload = {
        "nombre": "Nuevo Producto",
        "descripcion": "Una descripción",
        "precio": 150.0,
    }
    response = admin_client.post("/api/v1/productos/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["nombre"] == "Nuevo Producto"
    assert data["data"]["precio"] == 150.0


def test_create_producto_con_imagenes(admin_client):
    """POST con array de imágenes."""
    payload = {
        "nombre": "Producto con Fotos",
        "descripcion": "Tiene múltiples imágenes",
        "precio": 200.0,
        "imagenes_url": [
            "http://example.com/img1.jpg",
            "http://example.com/img2.jpg"
        ]
    }
    response = admin_client.post("/api/v1/productos/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert len(data["data"]["imagenes_url"]) == 2


def test_update_producto_sin_auth(client, session):
    """PUT sin autenticación debe retornar 401."""
    prod_data = ProductoCreate(nombre="Original", descripcion="", precio=100.0)
    prod = producto_service.create(session, prod_data)
    session.refresh(prod)

    payload = {"nombre": "Actualizado"}
    response = client.put(f"/api/v1/productos/{prod.id}", json=payload)
    assert response.status_code == 401


def test_update_producto_con_admin(admin_client, session):
    """PUT con admin debe actualizar producto."""
    prod_data = ProductoCreate(
        nombre="Original",
        descripcion="Desc original",
        precio=100.0,
    )
    prod = producto_service.create(session, prod_data)
    session.refresh(prod)

    payload = {
        "nombre": "Actualizado",
        "precio": 150.0,
    }
    response = admin_client.put(f"/api/v1/productos/{prod.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["nombre"] == "Actualizado"
    assert data["data"]["precio"] == 150.0


def test_update_producto_no_existente(admin_client):
    """PUT a producto inexistente."""
    payload = {"nombre": "No existe"}
    response = admin_client.put("/api/v1/productos/999", json=payload)
    data = response.json()
    assert data["success"] is False
    assert "no encontrado" in data["message"].lower()


def test_delete_producto_sin_auth(client, session):
    """DELETE sin autenticación debe retornar 401."""
    prod_data = ProductoCreate(nombre="Para borrar", descripcion="", precio=100.0)
    prod = producto_service.create(session, prod_data)
    session.refresh(prod)

    response = client.delete(f"/api/v1/productos/{prod.id}")
    assert response.status_code == 401


def test_delete_producto_con_admin(admin_client, session):
    """DELETE con admin debe soft-deletar producto."""
    prod_data = ProductoCreate(nombre="Para eliminar", descripcion="", precio=100.0)
    prod = producto_service.create(session, prod_data)
    session.refresh(prod)

    response = admin_client.delete(f"/api/v1/productos/{prod.id}")
    assert response.status_code in (200, 204)


def test_delete_producto_no_existente(admin_client):
    """DELETE a producto inexistente."""
    response = admin_client.delete("/api/v1/productos/999")
    data = response.json()
    assert data["success"] is False
    assert "no encontrado" in data["message"].lower()
