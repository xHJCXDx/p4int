import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import backend.core.models_registry  # noqa: F401
from backend.core.database import get_session
from backend.main import create_app
from backend.modules.auth.models import Rol, Usuario, UsuarioRolLink
from backend.modules.auth.security import hash_password
from backend.modules.ingredientes.models import UnidadMedida
from backend.modules.pedidos.models import EstadoPedido, FormaPago


@pytest.fixture
def engine():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)
    return test_engine


@pytest.fixture
def db_session(engine):
    from backend.core.rate_limit import auth_limiter

    auth_limiter._attempts.clear()
    with Session(engine) as session:
        seed_basics(session)
        yield session


@pytest.fixture
def client(db_session):
    import backend.core.startup as startup

    startup.engine = db_session.bind
    startup.ensure_schema_compatibility = lambda: None

    app = create_app()
    app.dependency_overrides[get_session] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def seed_basics(session: Session) -> None:
    for unidad in [
        UnidadMedida(nombre="Kilogramo", simbolo="kg", tipo="peso"),
        UnidadMedida(nombre="Gramo", simbolo="g", tipo="peso"),
        UnidadMedida(nombre="Litro", simbolo="L", tipo="volumen"),
        UnidadMedida(nombre="Mililitro", simbolo="ml", tipo="volumen"),
        UnidadMedida(nombre="Unidad", simbolo="ud", tipo="contable"),
        UnidadMedida(nombre="Porciones", simbolo="porciones", tipo="contable"),
    ]:
        session.add(unidad)

    roles = {
        Rol.ADMIN: Rol(codigo=Rol.ADMIN, nombre="Administrador", descripcion="Admin"),
        Rol.PEDIDOS: Rol(codigo=Rol.PEDIDOS, nombre="Gestor de pedidos", descripcion="Pedidos"),
        Rol.STOCK: Rol(codigo=Rol.STOCK, nombre="Gestor de stock", descripcion="Stock"),
        Rol.CLIENT: Rol(codigo=Rol.CLIENT, nombre="Cliente", descripcion="Client"),
    }
    for role in roles.values():
        session.add(role)
    session.flush()

    admin = Usuario(nombre="Admin", email="admin@test.com", password_hash=hash_password("admin123"))
    client = Usuario(nombre="Cliente", email="cliente@test.com", password_hash=hash_password("cliente123"))
    stock = Usuario(nombre="Stock", email="stock@test.com", password_hash=hash_password("stock123"))
    session.add(admin)
    session.add(client)
    session.add(stock)
    session.flush()
    session.add(UsuarioRolLink(usuario_id=admin.id, rol_codigo=roles[Rol.ADMIN].codigo))
    session.add(UsuarioRolLink(usuario_id=client.id, rol_codigo=roles[Rol.CLIENT].codigo))
    session.add(UsuarioRolLink(usuario_id=stock.id, rol_codigo=roles[Rol.STOCK].codigo))

    for fp in [
        FormaPago(codigo="EFECTIVO", descripcion="Pago en efectivo"),
        FormaPago(codigo="MERCADOPAGO", descripcion="MercadoPago"),
    ]:
        session.add(fp)

    for estado in [
        EstadoPedido(codigo="PENDIENTE", descripcion="Pendiente", orden=1, es_terminal=False),
        EstadoPedido(codigo="CONFIRMADO", descripcion="Confirmado", orden=2, es_terminal=False),
        EstadoPedido(codigo="EN_PREP", descripcion="En preparacion", orden=3, es_terminal=False),
        EstadoPedido(codigo="ENTREGADO", descripcion="Entregado", orden=4, es_terminal=True),
        EstadoPedido(codigo="CANCELADO", descripcion="Cancelado", orden=5, es_terminal=True),
    ]:
        session.add(estado)

    session.commit()
