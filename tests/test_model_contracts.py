def _login_admin(client):
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    assert response.status_code == 200


def test_ingrediente_uses_unidad_medida_catalog(client):
    _login_admin(client)

    response = client.post(
        "/api/v1/ingredientes",
        json={
            "nombre": "Harina test",
            "descripcion": "Ingrediente para prueba",
            "es_alergeno": False,
            "unidad_medida": "g",
            "stock_cantidad": 25,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["unidad_medida"] == "g"
    assert body["unidad_medida_id"] is not None
    assert body["stock_cantidad"] == 25


def test_ingrediente_rejects_unknown_unidad(client):
    _login_admin(client)

    response = client.post(
        "/api/v1/ingredientes",
        json={
            "nombre": "Unidad invalida",
            "descripcion": "Ingrediente para prueba",
            "es_alergeno": False,
            "unidad_medida": "cajas",
            "stock_cantidad": 10,
        },
    )

    assert response.status_code == 422
