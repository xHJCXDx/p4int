"""Tests para la capa de servicio de pedidos."""

import pytest
from sqlmodel import Session, select

from app.modules.pedidos.schema import PedidoCreate, PedidoUpdate, DetallePedidoCreate
from app.modules.pedidos.model import Pedido, DetallePedido, HistorialEstadoPedido
from app.modules.pagos.model import Pago
from app.modules.pedidos import service as pedido_service
from app.modules.productos.schema import ProductoCreate
from app.modules.productos import service as producto_service


def test_create_pedido(session, catalogo_seed):
    """Crear un pedido y verificar que se crea el HistorialEstadoPedido inicial (RN-02)."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    assert pedido.id is not None
    assert pedido.usuario_id == 1
    assert pedido.estado_codigo == "PENDIENTE"
    assert pedido.subtotal == 100.0
    assert pedido.total == 150.0
    assert pedido.deleted_at is None

    # Verificar que se creó el HistorialEstadoPedido (RN-02)
    historial = session.exec(
        select(HistorialEstadoPedido).where(HistorialEstadoPedido.pedido_id == pedido.id)
    ).all()
    assert len(historial) == 1
    assert historial[0].estado_desde is None  # Creación inicial
    assert historial[0].estado_hacia == "PENDIENTE"


def test_get_all_pedidos_paginado(session, catalogo_seed):
    """Obtener pedidos con paginación."""
    # Crear 5 pedidos
    for i in range(5):
        pedido_data = PedidoCreate(
            usuario_id=1,
            estado_codigo="PENDIENTE",
            forma_pago_codigo="MERCADOPAGO",
            subtotal=100.0 * (i + 1),
            total=150.0 * (i + 1)
        )
        pedido_service.create_pedido(session, pedido_data)

    # Obtener paginado
    pedidos, total = pedido_service.get_all_pedidos(session, limit=3, offset=0)
    assert len(pedidos) == 3
    assert total == 5

    pedidos_page2, total = pedido_service.get_all_pedidos(session, limit=3, offset=3)
    assert len(pedidos_page2) == 2
    assert total == 5


def test_get_by_id_existente(session, catalogo_seed):
    """Obtener pedido existente por ID."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    created = pedido_service.create_pedido(session, pedido_data)
    session.refresh(created)

    retrieved = pedido_service.get_pedido_by_id(session, created.id)
    assert retrieved is not None
    assert retrieved.id == created.id
    assert retrieved.usuario_id == 1


def test_get_by_id_no_existente(session, catalogo_seed):
    """Obtener pedido inexistente retorna None."""
    result = pedido_service.get_pedido_by_id(session, 999)
    assert result is None


def test_update_pedido(session, catalogo_seed):
    """Actualizar un pedido (notas, costo_envio)."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    created = pedido_service.create_pedido(session, pedido_data)
    session.refresh(created)

    # Actualizar
    update_data = PedidoUpdate(
        notas="Entregar después de las 18hs",
        costo_envio=100.0
    )
    updated = pedido_service.update_pedido(session, created, update_data)
    session.refresh(updated)

    assert updated.notas == "Entregar después de las 18hs"
    assert updated.costo_envio == 100.0


def test_delete_pedido_soft(session, catalogo_seed):
    """Eliminar un pedido (soft delete)."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    created = pedido_service.create_pedido(session, pedido_data)
    session.refresh(created)

    assert created.deleted_at is None

    pedido_service.delete_pedido(session, created)
    session.refresh(created)

    assert created.deleted_at is not None


def test_transition_pendiente_a_confirmado(session, catalogo_seed):
    """Transición válida: PENDIENTE → CONFIRMADO."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    # Transicionar a CONFIRMADO
    pedido_service.transition_estado(session, pedido.id, "CONFIRMADO", usuario_id=1)
    session.refresh(pedido)

    assert pedido.estado_codigo == "CONFIRMADO"

    # Verificar historial
    historial = session.exec(
        select(HistorialEstadoPedido).where(HistorialEstadoPedido.pedido_id == pedido.id)
    ).all()
    assert len(historial) == 2
    assert historial[1].estado_desde == "PENDIENTE"
    assert historial[1].estado_hacia == "CONFIRMADO"


def test_transition_confirmado_a_en_prep(session, catalogo_seed):
    """Transición válida: CONFIRMADO → EN_PREP."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="CONFIRMADO",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    pedido_service.transition_estado(session, pedido.id, "EN_PREP", usuario_id=1)
    session.refresh(pedido)

    assert pedido.estado_codigo == "EN_PREP"


def test_transition_en_camino_a_cancelado_falla(session, catalogo_seed):
    """Transición inválida: EN_CAMINO → CANCELADO debe fallar (ValueError)."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="EN_CAMINO",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    # Intentar cancelar desde EN_CAMINO (no permitido)
    with pytest.raises(ValueError) as exc_info:
        pedido_service.transition_estado(session, pedido.id, "CANCELADO", usuario_id=1)

    assert "no permitida" in str(exc_info.value).lower()


def test_transition_cancelar_sin_motivo_falla(session, catalogo_seed):
    """RN-05: Cancelar sin motivo debe lanzar ValueError."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    # Intentar cancelar sin motivo (RN-05)
    with pytest.raises(ValueError) as exc_info:
        pedido_service.transition_estado(session, pedido.id, "CANCELADO", usuario_id=1, motivo=None)

    assert "motivo" in str(exc_info.value).lower()


def test_transition_cancelar_con_motivo(session, catalogo_seed):
    """PENDIENTE → CANCELADO con motivo (válido)."""
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    pedido_service.transition_estado(
        session, pedido.id, "CANCELADO", usuario_id=1, motivo="Cliente cambió de opinión"
    )
    session.refresh(pedido)

    assert pedido.estado_codigo == "CANCELADO"

    # Verificar historial con motivo
    historial = session.exec(
        select(HistorialEstadoPedido).where(HistorialEstadoPedido.pedido_id == pedido.id)
    ).all()
    ultimo = historial[-1]
    assert ultimo.estado_hacia == "CANCELADO"
    assert ultimo.motivo == "Cliente cambió de opinión"


def test_create_detalle_pedido(session, catalogo_seed):
    """Crear un detalle de pedido con snapshots."""
    # Crear producto
    prod_data = ProductoCreate(
        nombre="Hamburguesa",
        descripcion="Clásica",
        precio_base=500.0
    )
    producto = producto_service.create(session, prod_data)
    session.refresh(producto)

    # Crear pedido
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=500.0,
        total=550.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    # Crear detalle
    detalle_data = DetallePedidoCreate(
        pedido_id=pedido.id,
        producto_id=producto.id,
        cantidad=1,
        nombre_snapshot="Hamburguesa",
        precio_snapshot=500.0,
        subtotal_snap=500.0
    )
    detalle = pedido_service.create_detalle_pedido(session, pedido.id, detalle_data)
    session.refresh(detalle)

    assert detalle.pedido_id == pedido.id
    assert detalle.producto_id == producto.id
    assert detalle.cantidad == 1
    assert detalle.nombre_snapshot == "Hamburguesa"
    assert detalle.precio_snapshot == 500.0


def test_get_detalles_pedido(session, catalogo_seed):
    """Obtener detalles de un pedido."""
    # Crear 2 productos
    productos = []
    for i in range(2):
        prod_data = ProductoCreate(nombre=f"Pizza {i}", descripcion="", precio_base=800.0)
        prod = producto_service.create(session, prod_data)
        session.refresh(prod)
        productos.append(prod)

    # Crear pedido
    pedido_data = PedidoCreate(
        usuario_id=1,
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=800.0,
        total=850.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)

    # Crear 2 detalles (con productos diferentes)
    for i in range(2):
        detalle_data = DetallePedidoCreate(
            pedido_id=pedido.id,
            producto_id=productos[i].id,
            cantidad=i + 1,
            nombre_snapshot=f"Pizza {i}",
            precio_snapshot=800.0,
            subtotal_snap=800.0 * (i + 1)
        )
        pedido_service.create_detalle_pedido(session, pedido.id, detalle_data)

    # Obtener detalles
    detalles = pedido_service.get_detalles_by_pedido(session, pedido.id)
    assert len(detalles) == 2


def test_create_pago(session, catalogo_seed):
    """Crear un pago directamente con el modelo Pago."""
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

    # Crear pago directo (el servicio requiere current_user)
    pago = Pago(
        pedido_id=pedido.id,
        mp_status="approved",
        transaction_amount=200.0,
        external_reference="REF123",
        idempotency_key="IDEM123",
    )
    session.add(pago)
    session.commit()
    session.refresh(pago)

    assert pago.pedido_id == pedido.id
    assert pago.mp_status == "approved"
    assert pago.transaction_amount == 200.0
    assert pago.external_reference == "REF123"


def test_update_pago(session, catalogo_seed):
    """Actualizar un pago via repository."""
    from app.modules.pagos.repository import PagoRepository

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

    # Crear pago directo
    pago = Pago(
        pedido_id=pedido.id,
        mp_status="pending",
        transaction_amount=200.0,
        external_reference="REF456",
        idempotency_key="IDEM456",
    )
    session.add(pago)
    session.commit()
    session.refresh(pago)

    # Actualizar via repository
    repo = PagoRepository(session)
    updated = repo.update(pago, {"mp_status": "approved", "mp_payment_id": 999999})
    session.commit()
    session.refresh(updated)

    assert updated.mp_status == "approved"
    assert updated.mp_payment_id == 999999
