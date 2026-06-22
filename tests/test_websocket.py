from decimal import Decimal

from backend.modules.pedidos.models import Pedido


def _login_admin_token(client) -> str:
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def _create_pending_order(db_session) -> int:
    pedido = Pedido(
        usuario_id=2,
        forma_pago_codigo="EFECTIVO",
        estado_codigo="PENDIENTE",
        subtotal=Decimal("100"),
        descuento=Decimal("0"),
        costo_envio=Decimal("0"),
        total=Decimal("100"),
    )
    db_session.add(pedido)
    db_session.commit()
    return int(pedido.id)


def test_admin_websocket_receives_order_status_change(client, db_session):
    token = _login_admin_token(client)
    pedido_id = _create_pending_order(db_session)

    with client.websocket_connect(f"/api/v1/ws/admin/pedidos?token={token}") as websocket:
        response = client.patch(
            f"/api/v1/pedidos/{pedido_id}/estado",
            json={"nuevo_estado": "CANCELADO", "motivo": "Prueba websocket"},
        )
        assert response.status_code == 200

        message = websocket.receive_json()
        assert message["event"] == "estado_cambiado"
        assert message["pedido_id"] == pedido_id
        assert message["estado_hacia"] == "CANCELADO"
