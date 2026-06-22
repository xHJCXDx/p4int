from decimal import Decimal

from backend.core.links import ProductoCategoriaLink, ProductoIngredienteLink
from backend.modules.categorias.models import Categoria
from backend.modules.ingredientes.models import Ingrediente
from backend.modules.pedidos.models import DetallePedido, HistorialEstadoPedido, Pedido
from backend.modules.productos.models import Producto


def _login(client, email="cliente@test.com", password="cliente123"):
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


def _create_pedido(db_session) -> int:
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
    db_session.flush()
    db_session.add(
        DetallePedido(
            pedido_id=pedido.id,
            producto_id=1,
            cantidad=1,
            nombre_snapshot="Producto test",
            precio_snapshot=Decimal("100"),
            subtotal_snap=Decimal("100"),
            personalizacion=[],
        )
    )
    db_session.add(
        HistorialEstadoPedido(
            pedido_id=pedido.id,
            estado_desde=None,
            estado_hacia="PENDIENTE",
            usuario_id=2,
        )
    )
    db_session.commit()
    return int(pedido.id)


def _create_stocked_producto(db_session, *, stock_manual=0, ingrediente_stock=6, cantidad_receta="2"):
    categoria = Categoria(nombre=f"Categoria {stock_manual}-{ingrediente_stock}-{cantidad_receta}")
    ingrediente = Ingrediente(
        nombre=f"Ingrediente {stock_manual}-{ingrediente_stock}-{cantidad_receta}",
        unidad_medida_id=5,
        stock_cantidad=ingrediente_stock,
    )
    producto = Producto(
        nombre=f"Producto {stock_manual}-{ingrediente_stock}-{cantidad_receta}",
        precio_base=Decimal("100.00"),
        stock_cantidad=stock_manual,
        disponible=True,
    )
    db_session.add(categoria)
    db_session.add(ingrediente)
    db_session.add(producto)
    db_session.flush()
    db_session.add(ProductoCategoriaLink(producto_id=producto.id, categoria_id=categoria.id, es_principal=True))
    db_session.add(
        ProductoIngredienteLink(
            producto_id=producto.id,
            ingrediente_id=ingrediente.id,
            cantidad=Decimal(str(cantidad_receta)),
            unidad_medida_id=ingrediente.unidad_medida_id,
        )
    )
    db_session.commit()
    return producto.id, ingrediente.id


def _create_pending_pedido_with_producto(db_session, producto_id, cantidad) -> int:
    pedido = Pedido(
        usuario_id=2,
        forma_pago_codigo="EFECTIVO",
        estado_codigo="PENDIENTE",
        subtotal=Decimal("100") * cantidad,
        descuento=Decimal("0"),
        costo_envio=Decimal("0"),
        total=Decimal("100") * cantidad,
    )
    db_session.add(pedido)
    db_session.flush()
    db_session.add(
        DetallePedido(
            pedido_id=pedido.id,
            producto_id=producto_id,
            cantidad=cantidad,
            nombre_snapshot="Producto stock calculado",
            precio_snapshot=Decimal("100"),
            subtotal_snap=Decimal("100") * cantidad,
            personalizacion=[],
        )
    )
    db_session.add(
        HistorialEstadoPedido(
            pedido_id=pedido.id,
            estado_desde=None,
            estado_hacia="PENDIENTE",
            usuario_id=2,
        )
    )
    db_session.commit()
    return int(pedido.id)


def test_invalid_transition_rejects_en_camino(client, db_session):
    pedido_id = _create_pedido(db_session)
    _login(client, email="admin@test.com", password="admin123")

    response = client.patch(f"/api/v1/pedidos/{pedido_id}/estado", json={"estado_hacia": "EN_CAMINO"})

    assert response.status_code == 422


def test_cancel_requires_motivo(client, db_session):
    pedido_id = _create_pedido(db_session)
    _login(client)

    response = client.patch(f"/api/v1/pedidos/{pedido_id}/estado", json={"estado_hacia": "CANCELADO"})

    assert response.status_code == 422


def test_cancel_appends_history(client, db_session):
    pedido_id = _create_pedido(db_session)
    _login(client)

    response = client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"estado_hacia": "CANCELADO", "motivo": "Cambio de planes"},
    )

    assert response.status_code == 200
    historial = response.json()["historial"]
    assert [item["estado_hacia"] for item in historial] == ["PENDIENTE", "CANCELADO"]


def test_stock_can_view_orders_but_not_change_status(client, db_session):
    pedido_id = _create_pedido(db_session)
    _login(client, email="stock@test.com", password="stock123")

    list_response = client.get("/api/v1/pedidos")
    detail_response = client.get(f"/api/v1/pedidos/{pedido_id}")
    patch_response = client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"estado_hacia": "CONFIRMADO"},
    )

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == pedido_id
    assert patch_response.status_code == 403


def test_pedido_creation_uses_ingredient_stock_not_manual_product_stock(client, db_session):
    producto_id, ingrediente_id = _create_stocked_producto(
        db_session,
        stock_manual=0,
        ingrediente_stock=6,
        cantidad_receta="2",
    )
    _login(client)

    response = client.post(
        "/api/v1/pedidos",
        json={"forma_pago_codigo": "EFECTIVO", "items": [{"producto_id": producto_id, "cantidad": 3}]},
    )

    assert response.status_code == 201
    assert response.json()["estado_codigo"] == "PENDIENTE"
    assert db_session.get(Ingrediente, ingrediente_id).stock_cantidad == 6
    assert db_session.get(Producto, producto_id).stock_cantidad == 0


def test_pedido_creation_rejects_product_without_recipe(client, db_session):
    categoria = Categoria(nombre="Sin receta test")
    producto = Producto(
        nombre="Producto sin receta",
        precio_base=Decimal("100.00"),
        stock_cantidad=99,
        disponible=True,
    )
    db_session.add(categoria)
    db_session.add(producto)
    db_session.flush()
    db_session.add(ProductoCategoriaLink(producto_id=producto.id, categoria_id=categoria.id, es_principal=True))
    producto_id = producto.id
    db_session.commit()
    _login(client)

    response = client.post(
        "/api/v1/pedidos",
        json={"forma_pago_codigo": "EFECTIVO", "items": [{"producto_id": producto_id, "cantidad": 1}]},
    )

    assert response.status_code == 400
    assert "no es vendible" in response.json()["detail"]


def test_confirming_order_deducts_ingredients_only(client, db_session):
    producto_id, ingrediente_id = _create_stocked_producto(
        db_session,
        stock_manual=0,
        ingrediente_stock=6,
        cantidad_receta="2",
    )
    pedido_id = _create_pending_pedido_with_producto(db_session, producto_id, cantidad=3)
    _login(client, email="admin@test.com", password="admin123")

    response = client.patch(f"/api/v1/pedidos/{pedido_id}/estado", json={"estado_hacia": "CONFIRMADO"})

    assert response.status_code == 200
    assert response.json()["estado_codigo"] == "CONFIRMADO"
    assert db_session.get(Ingrediente, ingrediente_id).stock_cantidad == 0
    assert db_session.get(Producto, producto_id).stock_cantidad == 0


def test_confirming_order_with_insufficient_ingredient_stock_keeps_stock(client, db_session):
    producto_id, ingrediente_id = _create_stocked_producto(
        db_session,
        stock_manual=99,
        ingrediente_stock=5,
        cantidad_receta="2",
    )
    pedido_id = _create_pending_pedido_with_producto(db_session, producto_id, cantidad=3)
    _login(client, email="admin@test.com", password="admin123")

    response = client.patch(f"/api/v1/pedidos/{pedido_id}/estado", json={"estado_hacia": "CONFIRMADO"})

    assert response.status_code == 409
    assert "Stock insuficiente" in response.json()["detail"]
    assert db_session.get(Ingrediente, ingrediente_id).stock_cantidad == 5
    assert db_session.get(Producto, producto_id).stock_cantidad == 99


def test_cancel_confirmed_order_restores_ingredients_only(client, db_session):
    producto_id, ingrediente_id = _create_stocked_producto(
        db_session,
        stock_manual=0,
        ingrediente_stock=6,
        cantidad_receta="2",
    )
    pedido_id = _create_pending_pedido_with_producto(db_session, producto_id, cantidad=2)
    _login(client, email="admin@test.com", password="admin123")

    confirm_response = client.patch(f"/api/v1/pedidos/{pedido_id}/estado", json={"estado_hacia": "CONFIRMADO"})
    cancel_response = client.patch(
        f"/api/v1/pedidos/{pedido_id}/estado",
        json={"estado_hacia": "CANCELADO", "motivo": "Sin stock"},
    )

    assert confirm_response.status_code == 200
    assert cancel_response.status_code == 200
    assert db_session.get(Ingrediente, ingrediente_id).stock_cantidad == 6
    assert db_session.get(Producto, producto_id).stock_cantidad == 0
