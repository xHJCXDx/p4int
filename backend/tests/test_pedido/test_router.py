"""Tests para los routers de pedidos."""

import pytest
from app.modules.pedidos.schema import PedidoCreate
from app.modules.productos.schema import ProductoCreate
from app.modules.pedidos import service as pedido_service

from app.modules.productos import service as producto_service


def test_get_pedidos_sin_auth(client):
    """GET /api/v1/pedidos/ sin autenticación debe retornar 401."""
    response = client.get("/api/v1/pedidos/")
    assert response.status_code == 401


def test_get_pedidos_con_admin(admin_client, session, catalogo_seed):
    """GET /api/v1/pedidos/ con admin lista todos los pedidos."""
    # Crear 3 pedidos
    for i in range(3):
        pedido_data = PedidoCreate(
            usuario_id=1,
            estado_codigo="PENDIENTE",
            forma_pago_codigo="MERCADOPAGO",
            subtotal=100.0 * (i + 1),
            total=150.0 * (i + 1)
        )
        pedido_service.create_pedido(session, pedido_data)

    response = admin_client.get("/api/v1/pedidos/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["total"] == 3
    assert len(data["data"]["items"]) == 3


def test_get_pedidos_paginacion(admin_client, session, catalogo_seed):
    """GET /api/v1/pedidos/ respeta page y size."""
    for i in range(5):
        pedido_data = PedidoCreate(
            usuario_id=1,
            estado_codigo="PENDIENTE",
            forma_pago_codigo="MERCADOPAGO",
            subtotal=100.0,
            total=150.0
        )
        pedido_service.create_pedido(session, pedido_data)

    # Primera página
    response = admin_client.get("/api/v1/pedidos/?page=1&size=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 3
    assert data["data"]["total"] == 5
    assert data["data"]["page"] == 1
    assert data["data"]["size"] == 3
    assert data["data"]["pages"] == 2

    # Segunda página
    response = admin_client.get("/api/v1/pedidos/?page=2&size=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["items"]) == 2


def test_get_pedido_por_id_con_admin(admin_client, session, catalogo_seed):
    """GET /api/v1/pedidos/{id} con admin."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = admin_client.get(f"/api/v1/pedidos/{pedido.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["id"] == pedido.id
    assert data["data"]["usuario_id"] == 1


def test_get_pedido_no_existente(admin_client):
    """GET /api/v1/pedidos/{id} con pedido inexistente."""
    response = admin_client.get("/api/v1/pedidos/999")
    data = response.json()
    assert data["success"] is False


def test_create_pedido_sin_auth(client):
    """POST /api/v1/pedidos/ sin autenticación debe retornar 401."""
    payload = {
        "usuario_id": 1,
        "estado_codigo": "PENDIENTE",
        "forma_pago_codigo": "MERCADOPAGO",
        "subtotal": 100.0,
        "total": 150.0
    }
    response = client.post("/api/v1/pedidos/", json=payload)
    assert response.status_code == 401


@pytest.mark.skip(reason="Checkout usa Decimal que SQLite no soporta; requiere PostgreSQL")
def test_create_pedido_con_admin(admin_client, session, catalogo_seed):
    """POST /api/v1/pedidos/ con admin debe crear pedido desde checkout (201)."""
    from app.modules.ingredientes.model import Ingrediente
    from app.modules.productos.model import ProductoIngredienteLink
    from app.modules.direcciones.model import DireccionEntrega

    from app.modules.catalogo.model import UnidadMedida

    # Crear unidad de medida necesaria para el link
    if not session.get(UnidadMedida, "KG"):
        session.add(UnidadMedida(codigo="KG", nombre="Kilogramo", simbolo="kg", tipo="peso"))
        session.flush()

    # Crear ingrediente con stock
    ingrediente = Ingrediente(
        nombre="Carne", descripcion="Carne vacuna",
        stock=100, es_alergeno=False
    )
    session.add(ingrediente)
    session.flush()

    # Crear producto
    prod_data = ProductoCreate(nombre="Hamburguesa", descripcion="", precio=500.0)
    producto = producto_service.create(session, prod_data)
    session.refresh(producto)

    # Vincular ingrediente al producto
    link = ProductoIngredienteLink(
        producto_id=producto.id, ingrediente_id=ingrediente.id,
        cantidad=1, unidad_medida_codigo="KG",
    )
    session.add(link)

    # Crear dirección para el admin (usuario_id=1)
    direccion = DireccionEntrega(
        usuario_id=1, alias="Casa", calle="Calle Falsa",
        numero="123", localidad="CABA", provincia="Buenos Aires",
        codigo_postal="1000"
    )
    session.add(direccion)
    session.commit()
    session.refresh(direccion)

    payload = {
        "direccion_id": direccion.id,
        "forma_pago_codigo": "MERCADOPAGO",
        "notas": "Entregar rápido",
        "linea_ventas": [
            {"producto_id": producto.id, "cantidad": 2}
        ]
    }
    response = admin_client.post("/api/v1/pedidos/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["estado_codigo"] == "PENDIENTE"
    assert data["data"]["notas"] == "Entregar rápido"


def test_cancel_pedido_sin_auth(client, session, catalogo_seed):
    """DELETE /api/v1/pedidos/{id} sin autenticación debe retornar 401."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = client.delete(f"/api/v1/pedidos/{pedido.id}")
    assert response.status_code == 401


def test_cancel_pedido_con_admin(admin_client, session, catalogo_seed):
    """DELETE /api/v1/pedidos/{id} con admin debe cancelar pedido (RN-05 requiere motivo)."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = admin_client.delete(f"/api/v1/pedidos/{pedido.id}?motivo=Ya+no+lo+quiero")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["estado_codigo"] == "CANCELADO"


def test_avanzar_estado_sin_auth(client, session, catalogo_seed):
    """PATCH /api/v1/pedidos/{id}/estado sin auth debe retornar 401."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = client.patch(
        f"/api/v1/pedidos/{pedido.id}/estado",
        json={"nuevo_estado": "CONFIRMADO"},
    )
    assert response.status_code == 401


def test_avanzar_estado_valido_confirmado(admin_client, session, catalogo_seed):
    """PATCH PENDIENTE → CONFIRMADO debe funcionar."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = admin_client.patch(
        f"/api/v1/pedidos/{pedido.id}/estado",
        json={"nuevo_estado": "CONFIRMADO"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["estado_codigo"] == "CONFIRMADO"


def test_avanzar_estado_valido_en_prep(admin_client, session, catalogo_seed):
    """PATCH CONFIRMADO → EN_PREP debe funcionar."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="CONFIRMADO",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = admin_client.patch(
        f"/api/v1/pedidos/{pedido.id}/estado",
        json={"nuevo_estado": "EN_PREP"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["estado_codigo"] == "EN_PREP"


def test_avanzar_estado_invalido_desde_terminal(admin_client, session, catalogo_seed):
    """PATCH desde estado terminal (ENTREGADO) debe fallar."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="ENTREGADO",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = admin_client.patch(
        f"/api/v1/pedidos/{pedido.id}/estado",
        json={"nuevo_estado": "EN_PREP"},
    )
    data = response.json()
    assert data["success"] is False


def test_avanzar_estado_invalido_salto(admin_client, session, catalogo_seed):
    """PATCH PENDIENTE → EN_PREP (salto) debe fallar."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = admin_client.patch(
        f"/api/v1/pedidos/{pedido.id}/estado",
        json={"nuevo_estado": "EN_PREP"},
    )
    data = response.json()
    assert data["success"] is False


def test_get_historial_con_admin(admin_client, session, catalogo_seed):
    """GET /api/v1/pedidos/{id}/historial con admin."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    response = admin_client.get(f"/api/v1/pedidos/{pedido.id}/historial")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1
    assert data["data"][0]["estado_hacia"] == "PENDIENTE"


def test_create_pago_con_admin(admin_client, session, catalogo_seed):
    """POST /api/v1/pagos/crear con admin."""
    # Crear pedido
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=150.0,
        total=200.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    payload = {
        "pedido_id": pedido.id,
        "transaction_amount": 200.0,
    }
    response = admin_client.post("/api/v1/pagos/crear", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["data"]["mp_status"] == "pending"
    assert data["data"]["transaction_amount"] == 200.0


def test_get_pago_por_pedido(admin_client, session, catalogo_seed):
    """GET /api/v1/pagos/{pedido_id} con admin."""
    from app.modules.pagos.model import Pago

    # Crear pedido
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=150.0,
        total=200.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    # Crear pago directo en BD
    pago = Pago(
        pedido_id=pedido.id,
        mp_status="approved",
        transaction_amount=200.0,
        external_reference="REF456",
        idempotency_key="IDEM456",
    )
    session.add(pago)
    session.commit()

    response = admin_client.get(f"/api/v1/pagos/{pedido.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["mp_status"] == "approved"
    assert data["data"]["transaction_amount"] == 200.0


def test_historial_append_only(admin_client, session, catalogo_seed):
    """Transicionar estado genera historial append-only."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    # Transicionar PENDIENTE → CONFIRMADO
    admin_client.patch(
        f"/api/v1/pedidos/{pedido.id}/estado",
        json={"nuevo_estado": "CONFIRMADO"},
    )

    # Transicionar CONFIRMADO → EN_PREP
    admin_client.patch(
        f"/api/v1/pedidos/{pedido.id}/estado",
        json={"nuevo_estado": "EN_PREP"},
    )

    # Verificar historial
    response = admin_client.get(f"/api/v1/pedidos/{pedido.id}/historial")
    assert response.status_code == 200
    data = response.json()
    historial = data["data"]
    assert len(historial) >= 2
    assert historial[-2]["estado_hacia"] == "CONFIRMADO"
    assert historial[-1]["estado_hacia"] == "EN_PREP"
