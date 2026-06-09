from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel


class UsuarioRolLink(SQLModel, table=True):
    __tablename__ = "usuario_rol"

    usuario_id: Optional[int] = Field(default=None, foreign_key="usuario.id", primary_key=True)
    rol_codigo: Optional[str] = Field(default=None, foreign_key="rol.codigo", primary_key=True)
    asignado_por_id: Optional[int] = Field(default=None, foreign_key="usuario.id")
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RolBase(SQLModel):
    nombre: str = Field(max_length=50, unique=True)
    descripcion: Optional[str] = None


class Rol(RolBase, table=True):
    """Roles del sistema: ADMIN, STOCK, PEDIDOS, CLIENT."""
    codigo: str = Field(primary_key=True, max_length=20)
    usuarios: List["Usuario"] = Relationship(
        back_populates="roles",
        link_model=UsuarioRolLink,
        sa_relationship_kwargs={
            "primaryjoin": "Rol.codigo == UsuarioRolLink.rol_codigo",
            "secondaryjoin": "Usuario.id == UsuarioRolLink.usuario_id",
        },
    )


class UsuarioBase(SQLModel):
    nombre: str = Field(max_length=80)
    apellido: str = Field(max_length=80)
    email: str = Field(index=True, unique=True, max_length=254)
    celular: Optional[str] = Field(default=None, max_length=20)


class Usuario(UsuarioBase, table=True):
    """Usuario del sistema con roles asociados."""
    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: str = Field(max_length=60)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None

    roles: List[Rol] = Relationship(
        back_populates="usuarios",
        link_model=UsuarioRolLink,
        sa_relationship_kwargs={
            "primaryjoin": "Usuario.id == UsuarioRolLink.usuario_id",
            "secondaryjoin": "Rol.codigo == UsuarioRolLink.rol_codigo",
        },
    )


class RefreshToken(SQLModel, table=True):
    """Tokens de refresco para sesiones de usuario."""
    __tablename__ = "refresh_token"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id")
    token_hash: str = Field(max_length=64, unique=True)
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
