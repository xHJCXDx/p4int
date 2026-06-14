"""Tests de integración para WebSocket /ws/pedidos."""

from datetime import timedelta

import pytest
from sqlmodel import Session, select

from app.core.security import hash_password, create_access_token
from app.modules.usuarios.model import Usuario, Rol, UsuarioRolLink


@pytest.fixture(scope="function")
def admin_token(session: Session) -> str:
    """Genera un JWT de admin válido para autenticar WS."""
    user = Usuario(
        nombre="WSAdmin", apellido="Test",
        email="ws_admin@test.com",
        password_hash=hash_password("ws_admin_pass"),
    )
    session.add(user)
    session.flush()

    admin_role = session.exec(select(Rol).where(Rol.codigo == "ADMIN")).first()
    if admin_role:
        session.add(UsuarioRolLink(usuario_id=user.id, rol_codigo=admin_role.codigo))
    session.commit()

    return create_access_token(
        data={"sub": str(user.id)},
        roles=["ADMIN"],
        expires_delta=timedelta(minutes=5),
    )


@pytest.fixture(scope="function")
def client_token(session: Session) -> str:
    """Genera un JWT de CLIENT para testear suscripción a pedido."""
    user = Usuario(
        nombre="WSClient", apellido="Test",
        email="ws_client@test.com",
        password_hash=hash_password("ws_client_pass"),
    )
    session.add(user)
    session.flush()

    client_role = session.exec(select(Rol).where(Rol.codigo == "CLIENT")).first()
    if client_role:
        session.add(UsuarioRolLink(usuario_id=user.id, rol_codigo=client_role.codigo))
    session.commit()

    return create_access_token(
        data={"sub": str(user.id)},
        roles=["CLIENT"],
        expires_delta=timedelta(minutes=5),
    )


def test_ws_admin_connects_to_admin_channel(client, admin_token):
    """Admin sin pedido_id se suscribe al canal 'admin'."""
    with client.websocket_connect(f"/ws/pedidos?token={admin_token}") as ws:
        # Conexión exitosa — no se cierra con error
        ws.close()


def test_ws_client_connects_to_pedido_channel(client, client_token):
    """Client con pedido_id se suscribe al canal 'pedido:{id}'."""
    with client.websocket_connect(f"/ws/pedidos?token={client_token}&pedido_id=42") as ws:
        ws.close()


def test_ws_rejects_invalid_token(client):
    """Token inválido cierra la conexión con code 4001."""
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/pedidos?token=invalid.jwt.token") as ws:
            ws.receive_text()


def test_ws_client_without_pedido_id_rejected(client, client_token):
    """Client sin pedido_id y sin rol admin/pedidos se rechaza con 4003."""
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws/pedidos?token={client_token}") as ws:
            ws.receive_text()
