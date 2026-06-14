"""Tests para autenticación: register, login, credenciales inválidas, logout."""


def test_register_ok(client):
    """POST /api/v1/auth/register crea usuario correctamente."""
    payload = {
        "nombre": "Juan",
        "apellido": "Pérez",
        "email": "juan@test.com",
        "password": "Secret123!",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "juan@test.com"
    assert "password" not in data["data"]


def test_register_email_duplicado(client):
    """POST /api/v1/auth/register con email existente falla."""
    payload = {
        "nombre": "Ana",
        "apellido": "Lopez",
        "email": "dup@test.com",
        "password": "Secret123!",
    }
    client.post("/api/v1/auth/register", json=payload)
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


def test_login_ok(client):
    """POST /api/v1/auth/login con credenciales válidas retorna tokens."""
    # Registrar primero
    client.post("/api/v1/auth/register", json={
        "nombre": "Login",
        "apellido": "User",
        "email": "login@test.com",
        "password": "Secret123!",
    })

    response = client.post("/api/v1/auth/login", json={
        "email": "login@test.com",
        "password": "Secret123!",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"


def test_login_credenciales_invalidas(client):
    """POST /api/v1/auth/login con password incorrecto retorna 401."""
    # Registrar
    client.post("/api/v1/auth/register", json={
        "nombre": "Fail",
        "apellido": "Login",
        "email": "fail@test.com",
        "password": "Secret123!",
    })

    response = client.post("/api/v1/auth/login", json={
        "email": "fail@test.com",
        "password": "WrongPass!",
    })
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == "INVALID_CREDENTIALS"


def test_login_email_inexistente(client):
    """POST /api/v1/auth/login con email que no existe retorna 401."""
    response = client.post("/api/v1/auth/login", json={
        "email": "noexiste@test.com",
        "password": "Secret123!",
    })
    assert response.status_code == 401


def test_me_sin_auth(client):
    """GET /api/v1/auth/me sin token retorna 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_con_auth(admin_client):
    """GET /api/v1/auth/me con token válido retorna datos del usuario."""
    response = admin_client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "admin@test.com"


def test_logout_con_refresh_token(client):
    """POST /api/v1/auth/logout revoca el refresh token."""
    # Registrar + login
    client.post("/api/v1/auth/register", json={
        "nombre": "Logout",
        "apellido": "Test",
        "email": "logout@test.com",
        "password": "Secret123!",
    })
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "logout@test.com",
        "password": "Secret123!",
    })
    tokens = login_resp.json()["data"]
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # Logout con Bearer token
    response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 204

    # Intentar usar refresh_token revocado
    response = client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert response.status_code == 401
