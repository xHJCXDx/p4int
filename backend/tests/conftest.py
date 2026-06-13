"""
Configuración global de fixtures para pytest.
Define engine de test, sesión de BD en memoria, cliente HTTP, y usuario admin autenticado.
"""

import pytest
from contextlib import asynccontextmanager
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine, select
from sqlmodel.pool import StaticPool

from app.main import app
from app.core.database import get_session
from app.core.constants import ROLES
from app.core.security import hash_password, create_access_token
from app.core.rate_limit import limiter
from app.modules.usuarios.model import Usuario, Rol, UsuarioRolLink


@pytest.fixture(scope="function", name="engine")
def engine_fixture():
    """Crea un engine de SQLite en memoria para cada test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # Crucial: reutiliza la misma conexión
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(scope="function", name="session")
def session_fixture(engine):
    """Crea una session de test con seed mínimo de roles."""
    with Session(engine) as session:
        # Seed de roles obligatorios
        for role_data in ROLES:
            existing = session.exec(select(Rol).where(Rol.codigo == role_data["codigo"])).first()
            if not existing:
                new_role = Rol(codigo=role_data["codigo"], nombre=role_data["nombre"], descripcion=role_data["descripcion"])
                session.add(new_role)
        session.commit()
        yield session


@pytest.fixture(scope="function", name="client")
def client_fixture(session):
    """Crea un TestClient con la session de test inyectada."""
    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override

    # Desactivar rate limiter en tests
    limiter.enabled = False

    # Reemplazar lifespan para que no ejecute seeds contra PostgreSQL real
    @asynccontextmanager
    async def _test_lifespan(app):
        yield

    original_lifespan = app.router.lifespan_context
    app.router.lifespan_context = _test_lifespan

    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client

    app.router.lifespan_context = original_lifespan
    app.dependency_overrides.clear()
    limiter.enabled = True


@pytest.fixture(scope="function", name="admin_client")
def admin_client_fixture(session, client):
    """
    Crea un cliente autenticado como admin.
    Crea un usuario admin en la BD y genera un JWT token válido.
    """
    # Crear usuario admin
    admin = Usuario(
        nombre="Admin",
        apellido="Test",
        email="admin@test.com",
        password_hash=hash_password("admin123")
    )
    session.add(admin)
    session.flush()

    # Asignar rol ADMIN
    admin_role = session.exec(select(Rol).where(Rol.codigo == "ADMIN")).first()
    if admin_role:
        usuario_rol = UsuarioRolLink(usuario_id=admin.id, rol_codigo=admin_role.codigo)
        session.add(usuario_rol)

    session.commit()

    # Generar token y setear como Bearer header
    token = create_access_token(
        data={"sub": str(admin.id)},
        expires_delta=timedelta(minutes=30)
    )
    client.headers["Authorization"] = f"Bearer {token}"

    return client
