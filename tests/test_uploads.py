def _login_admin(client):
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    assert response.status_code == 200


def test_upload_image_uses_local_fallback_and_delete(client, monkeypatch):
    for name in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"):
        monkeypatch.delenv(name, raising=False)
    _login_admin(client)
    png_1x1 = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00"
        b"\x00\x0cIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe"
        b"\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    response = client.post(
        "/api/v1/uploads/imagen",
        files={"file": ("producto.png", png_1x1, "image/png")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["provider"] == "local"
    assert body["url"].startswith("/uploads/productos/")
    assert body["public_id"].startswith("productos/")

    delete_response = client.delete(f"/api/v1/uploads/imagen/{body['public_id']}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "ok"


def test_upload_rejects_invalid_file(client):
    _login_admin(client)

    response = client.post(
        "/api/v1/uploads/imagen",
        files={"file": ("not-image.txt", b"hola", "text/plain")},
    )

    assert response.status_code == 422
