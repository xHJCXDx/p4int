"""Fixtures locales para tests de Pedidos."""

import pytest
from datetime import timedelta
from sqlmodel import Session, select

from app.modules.catalogo.model import FormaPago, EstadoPedido
from app.modules.usuarios.model import Usuario, Rol, UsuarioRolLink
from app.modules.pedidos.model import Pedido, HistorialEstadoPedido
from app.modules.pedidos.schema import PedidoCreate
from app.core.security import hash_password, create_access_token
from app.modules.pedidos import service as pedido_service


@pytest.fixture(scope="function", name="catalogo_seed")
def catalogo_seed_fixture(session: Session):
    """Seed de catálogos: FormaPago y EstadoPedido."""
    # FormaPagos
    formas = [
        {"codigo": "MERCADOPAGO", "descripcion": "Mercado Pago", "habilitado": True},
        {"codigo": "EFECTIVO", "descripcion": "Efectivo", "habilitado": True},
        {"codigo": "TRANSFERENCIA", "descripcion": "Transferencia Bancaria", "habilitado": True},
    ]
    for forma_data in formas:
        existing = session.exec(select(FormaPago).where(FormaPago.codigo == forma_data["codigo"])).first()
        if not existing:
            session.add(FormaPago(**forma_data))

    # EstadosPedido (5 estados — FSM v6.0, sin EN_CAMINO)
    estados = [
        {"codigo": "PENDIENTE", "descripcion": "Pedido creado", "orden": 1, "es_terminal": False},
        {"codigo": "CONFIRMADO", "descripcion": "Confirmado", "orden": 2, "es_terminal": False},
        {"codigo": "EN_PREP", "descripcion": "En preparación", "orden": 3, "es_terminal": False},
        {"codigo": "ENTREGADO", "descripcion": "Entregado", "orden": 4, "es_terminal": True},
        {"codigo": "CANCELADO", "descripcion": "Cancelado", "orden": 5, "es_terminal": True},
    ]
    for estado_data in estados:
        existing = session.exec(select(EstadoPedido).where(EstadoPedido.codigo == estado_data["codigo"])).first()
        if not existing:
            session.add(EstadoPedido(**estado_data))

    session.commit()
    yield session


@pytest.fixture(scope="function", name="usuario_client")
def usuario_client_fixture(session: Session):
    """Usuario con rol CLIENT para testear permisos restrictivos."""
    client_user = Usuario(
        nombre="Client User",
        email="client@test.com",
        password_hash=hash_password("pass1234")
    )
    session.add(client_user)
    session.flush()

    client_role = session.exec(select(Rol).where(Rol.codigo == "CLIENT")).first()
    if client_role:
        usuario_rol = UsuarioRolLink(usuario_id=client_user.id, rol_codigo=client_role.codigo)
        session.add(usuario_rol)

    session.commit()
    return client_user


@pytest.fixture(scope="function", name="pedido_base")
def pedido_base_fixture(session: Session, catalogo_seed, admin_client):
    """Crea un pedido base en estado PENDIENTE para usar en otros tests."""
    # Crear un pedido simple
    pedido_data = PedidoCreate(
        usuario_id=1,  # admin user id
        estado_codigo="PENDIENTE",
        forma_pago_codigo="MERCADOPAGO",
        subtotal=100.0,
        descuento=0.0,
        costo_envio=50.0,
        total=150.0
    )
    pedido = pedido_service.create_pedido(session, pedido_data)
    session.refresh(pedido)
    return pedido


@pytest.fixture(scope="function", name="client_authenticated")
def client_authenticated_fixture(session: Session, catalogo_seed, usuario_client, client):
    """Cliente autenticado con rol CLIENT."""
    token = create_access_token(
        data={"sub": str(usuario_client.id)},
        expires_delta=timedelta(minutes=30)
    )
    client.headers["Authorization"] = f"Bearer {token}"
    return client
