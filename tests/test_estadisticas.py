from decimal import Decimal

from backend.modules.pagos.models import Pago
from backend.modules.pedidos.models import DetallePedido, Pedido


def _login_admin(client):
    response = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "admin123"})
    assert response.status_code == 200


def _create_confirmed_order(db_session, *, mp_status: str = "approved", total: Decimal = Decimal("2000")) -> int:
    pedido = Pedido(
        usuario_id=2,
        forma_pago_codigo="EFECTIVO",
        estado_codigo="CONFIRMADO",
        subtotal=total,
        descuento=Decimal("0"),
        costo_envio=Decimal("0"),
        total=total,
    )
    db_session.add(pedido)
    db_session.flush()
    db_session.add(
        DetallePedido(
            pedido_id=pedido.id,
            producto_id=10,
            cantidad=2,
            nombre_snapshot="Producto estadistica",
            precio_snapshot=Decimal("1000"),
            subtotal_snap=total,
            personalizacion=[],
        )
    )
    db_session.add(
        Pago(
            pedido_id=pedido.id,
            mp_status=mp_status,
            transaction_amount=total,
            external_reference=str(pedido.id),
            idempotency_key=f"test-stats-{pedido.id}-{mp_status}",
        )
    )
    db_session.commit()
    return int(pedido.id)


def test_estadisticas_resumen_and_top_products(client, db_session):
    _login_admin(client)
    _create_confirmed_order(db_session, mp_status="approved", total=Decimal("2000"))
    _create_confirmed_order(db_session, mp_status="pending", total=Decimal("9000"))

    resumen = client.get("/api/v1/estadisticas/resumen")
    top = client.get("/api/v1/estadisticas/productos-top")
    ingresos = client.get("/api/v1/estadisticas/ingresos")

    assert resumen.status_code == 200
    assert resumen.json()["pedidos_totales"] == 2
    assert Decimal(resumen.json()["ventas_hoy"]) == Decimal("2000.00")
    assert Decimal(resumen.json()["ticket_promedio"]) == Decimal("2000.00")
    assert top.status_code == 200
    assert top.json()[0]["nombre"] == "Producto estadistica"
    assert Decimal(top.json()[0]["total"]) == Decimal("2000.00")
    assert ingresos.status_code == 200
    assert ingresos.json()[0]["forma_pago"] == "EFECTIVO"
    assert Decimal(ingresos.json()[0]["total"]) == Decimal("2000.00")
