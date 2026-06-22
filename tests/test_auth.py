def test_register_and_login(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"nombre": "Nuevo", "email": "nuevo@test.com", "password": "nuevo123"},
    )
    assert response.status_code == 201
    assert response.json()["email"] == "nuevo@test.com"

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "nuevo@test.com", "password": "nuevo123"},
    )
    assert login.status_code == 200
    body = login.json()
    assert body["access_token"]
    assert body["refresh_token"]


def test_login_invalid_password_returns_401(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "cliente@test.com", "password": "wrongpass"},
    )
    assert response.status_code == 401
