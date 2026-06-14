"""Tests para el módulo de estadísticas.

Verifica: resumen, ventas, productos-top, pedidos-por-estado, ingresos.
Aplica reglas EST-01 (CANCELADO excluido), EST-02 (subtotal_snap), EST-03 (solo approved).
"""

import pytest
from sqlmodel import select
from app.modules.catalogo.model import FormaPago, EstadoPedido
from app.modules.pedidos.model import Pedido, DetallePedido
from app.modules.pagos.model import Pago
from app.modules.productos.model import Producto


@pytest.fixture(scope="function", name="estadisticas_seed")
def estadisticas_seed_fixture(session, admin_client):
    """Seed completo: catálogos + pedidos con detalles y pagos para testing estadísticas."""
    # FormasPago
    for fp in [
        {"codigo": "MERCADOPAGO", "descripcion": "Mercado Pago", "habilitado": True},
        {"codigo": "EFECTIVO", "descripcion": "Efectivo", "habilitado": True},
    ]:
        if not session.exec(select(FormaPago).where(FormaPago.codigo == fp["codigo"])).first():
            session.add(FormaPago(**fp))

    # EstadosPedido
    for ep in [
        {"codigo": "PENDIENTE", "descripcion": "Pendiente", "orden": 1, "es_terminal": False},
        {"codigo": "CONFIRMADO", "descripcion": "Confirmado", "orden": 2, "es_terminal": False},
        {"codigo": "EN_PREP", "descripcion": "En preparación", "orden": 3, "es_terminal": False},
        {"codigo": "ENTREGADO", "descripcion": "Entregado", "orden": 4, "es_terminal": True},
        {"codigo": "CANCELADO", "descripcion": "Cancelado", "orden": 5, "es_terminal": True},
    ]:
        if not session.exec(select(EstadoPedido).where(EstadoPedido.codigo == ep["codigo"])).first():
            session.add(EstadoPedido(**ep))

    session.commit()

    # Producto para detalles
    producto = Producto(nombre="Hamburguesa", descripcion="", precio_base=500.0)
    session.add(producto)
    session.flush()

    # Pedido 1: CONFIRMADO con pago approved (debe contar en estadísticas)
    p1 = Pedido(
        usuario_id=1, estado_codigo="CONFIRMADO", forma_pago_codigo="MERCADOPAGO",
        subtotal=1000.0, descuento=0.0, costo_envio=50.0, total=1050.0,
    )
    session.add(p1)
    session.flush()
    session.add(DetallePedido(
        pedido_id=p1.id, producto_id=producto.id, cantidad=2,
        nombre_snapshot="Hamburguesa", precio_snapshot=500.0, subtotal_snap=1000.0,
    ))
    session.add(Pago(
        pedido_id=p1.id, mp_status="approved", transaction_amount=1050.0,
        external_reference="REF-001", idempotency_key="IDEM-001",
    ))

    # Pedido 2: ENTREGADO con pago approved (terminal pero no CANCELADO — cuenta)
    p2 = Pedido(
        usuario_id=1, estado_codigo="ENTREGADO", forma_pago_codigo="EFECTIVO",
        subtotal=800.0, descuento=0.0, costo_envio=50.0, total=850.0,
    )
    session.add(p2)
    session.flush()
    session.add(DetallePedido(
        pedido_id=p2.id, producto_id=producto.id, cantidad=1,
        nombre_snapshot="Hamburguesa", precio_snapshot=500.0, subtotal_snap=500.0,
    ))

    # Pedido 3: CANCELADO (EST-01: debe ser EXCLUIDO de cálculos)
    p3 = Pedido(
        usuario_id=1, estado_codigo="CANCELADO", forma_pago_codigo="MERCADOPAGO",
        subtotal=2000.0, descuento=0.0, costo_envio=50.0, total=2050.0,
    )
    session.add(p3)
    session.flush()
    session.add(DetallePedido(
        pedido_id=p3.id, producto_id=producto.id, cantidad=5,
        nombre_snapshot="Hamburguesa", precio_snapshot=500.0, subtotal_snap=2500.0,
    ))

    # Pedido 4: PENDIENTE con pago pending (no approved — no cuenta en ingresos)
    p4 = Pedido(
        usuario_id=1, estado_codigo="PENDIENTE", forma_pago_codigo="MERCADOPAGO",
        subtotal=500.0, descuento=0.0, costo_envio=50.0, total=550.0,
    )
    session.add(p4)
    session.flush()
    session.add(Pago(
        pedido_id=p4.id, mp_status="pending", transaction_amount=550.0,
        external_reference="REF-004", idempotency_key="IDEM-004",
    ))

    session.commit()
    return {"pedidos": [p1, p2, p3, p4], "producto": producto}


def test_resumen_ok(admin_client, estadisticas_seed):
    """GET /api/v1/estadisticas/resumen retorna KPIs."""
    response = admin_client.get("/api/v1/estadisticas/resumen")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    resumen = data["data"]
    assert "ventas_hoy" in resumen
    assert "ticket_promedio" in resumen
    assert "pedidos_activos" in resumen
    assert "ventas_mes_actual" in resumen
    # Pedidos activos: PENDIENTE + CONFIRMADO + EN_PREP (no terminales)
    assert resumen["pedidos_activos"] >= 2


def test_resumen_excluye_cancelado(admin_client, estadisticas_seed):
    """EST-01: ventas_hoy NO incluye pedidos CANCELADO."""
    response = admin_client.get("/api/v1/estadisticas/resumen")
    data = response.json()["data"]
    # El pedido CANCELADO tiene total=2050, los no-cancelados suman 1050+850+550=2450
    ventas = float(data["ventas_mes_actual"])
    assert ventas > 0
    # No debe incluir 2050 del cancelado
    assert ventas <= 2500.0


def test_ventas_por_periodo(admin_client, estadisticas_seed):
    """GET /api/v1/estadisticas/ventas retorna series por período."""
    response = admin_client.get(
        "/api/v1/estadisticas/ventas?desde=2020-01-01&hasta=2030-12-31&agrupacion=month"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    ventas = data["data"]
    assert isinstance(ventas, list)
    if len(ventas) > 0:
        assert "periodo" in ventas[0]
        assert "total_ventas" in ventas[0]
        assert "cantidad_pedidos" in ventas[0]


def test_productos_top(admin_client, estadisticas_seed):
    """GET /api/v1/estadisticas/productos-top usa subtotal_snap (EST-02)."""
    response = admin_client.get("/api/v1/estadisticas/productos-top?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    top = data["data"]
    assert isinstance(top, list)
    assert len(top) >= 1
    assert top[0]["nombre"] == "Hamburguesa"
    # Solo p1 (1000) + p2 (500) deben contar, NO p3 (CANCELADO, 2500)
    ingresos = float(top[0]["ingresos"])
    assert ingresos <= 1600.0


def test_pedidos_por_estado(admin_client, estadisticas_seed):
    """GET /api/v1/estadisticas/pedidos-por-estado agrupa por estado."""
    response = admin_client.get("/api/v1/estadisticas/pedidos-por-estado")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    estados = data["data"]
    assert isinstance(estados, list)
    codigos = {e["estado_codigo"] for e in estados}
    assert "CANCELADO" in codigos  # pedidos-por-estado muestra TODOS (es distribución)


def test_ingresos_solo_approved(admin_client, estadisticas_seed):
    """EST-03: GET /api/v1/estadisticas/ingresos solo cuenta pagos approved."""
    response = admin_client.get(
        "/api/v1/estadisticas/ingresos?desde=2020-01-01&hasta=2030-12-31"
    )
    assert response.status_code == 200
    data = response.json()
    ingresos = data["data"]
    assert isinstance(ingresos, list)
    # Solo el pago approved de p1 (1050) debe contar, NO p4 pending (550)
    total_ingresos = sum(float(i["total"]) for i in ingresos)
    assert total_ingresos == 1050.0


def test_estadisticas_requiere_admin(client):
    """Todos los endpoints de estadísticas requieren rol ADMIN."""
    endpoints = [
        "/api/v1/estadisticas/resumen",
        "/api/v1/estadisticas/ventas",
        "/api/v1/estadisticas/productos-top",
        "/api/v1/estadisticas/pedidos-por-estado",
        "/api/v1/estadisticas/ingresos",
    ]
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401, f"{endpoint} debería requerir autenticación"
