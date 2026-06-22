from decimal import Decimal

from backend.modules.pagos.models import Pago
from backend.modules.pedidos.models import Pedido


def _create_mp_pedido(db_session) -> int:
    pedido = Pedido(
        usuario_id=2,
        forma_pago_codigo="MERCADOPAGO",
        estado_codigo="PENDIENTE",
        subtotal=Decimal("1500"),
        descuento=Decimal("0"),
        costo_envio=Decimal("0"),
        total=Decimal("1500"),
    )
    db_session.add(pedido)
    db_session.commit()
    return int(pedido.id)


def test_confirm_pago_approved_persists_pago_and_confirms_order(client, db_session, monkeypatch):
    pedido_id = _create_mp_pedido(db_session)

    class FakePayment:
        def get(self, payment_id):
            return {"status": 500, "response": {}}

    class FakeSDK:
        def payment(self):
            return FakePayment()

    monkeypatch.setattr("backend.modules.pagos.services.mercadopago.SDK", lambda _: FakeSDK())

    response = client.post(
        "/api/v1/pagos/confirm",
        json={"pedido_id": pedido_id, "payment_id": 12345, "mp_status": "approved"},
    )

    assert response.status_code == 200
    assert response.json()["estado"] == "aprobado"

    pago = db_session.get(Pago, 1)
    pedido = db_session.get(Pedido, pedido_id)
    assert pago.mp_payment_id == 12345
    assert pago.mp_status == "approved"
    assert pedido.estado_codigo == "CONFIRMADO"
