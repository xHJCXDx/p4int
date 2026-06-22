from datetime import datetime
from typing import ClassVar, Optional

from sqlmodel import Field, Relationship, SQLModel


class Rol(SQLModel, table=True):
    """Tabla de roles del sistema. Los códigos son constantes de clase."""

    __tablename__ = "rol"

    ADMIN: ClassVar[str] = "ADMIN"
    STOCK: ClassVar[str] = "STOCK"
    PEDIDOS: ClassVar[str] = "PEDIDOS"
    CLIENT: ClassVar[str] = "CLIENT"

    codigo: str = Field(primary_key=True, max_length=20)
    nombre: str = Field(max_length=50, unique=True, index=True)
    descripcion: str = Field(default="")

    @classmethod
    def values(cls) -> set[str]:
        """Conjunto de códigos de rol válidos (para validar asignaciones)."""
        return {cls.ADMIN, cls.STOCK, cls.PEDIDOS, cls.CLIENT}


class UsuarioRolLink(SQLModel, table=True):
    """Tabla intermedia N:M entre Usuario y Rol."""

    __tablename__ = "usuario_rol"

    usuario_id: int = Field(foreign_key="usuario.id", primary_key=True)
    rol_codigo: str = Field(foreign_key="rol.codigo", primary_key=True, max_length=20)
    asignado_por_id: Optional[int] = Field(default=None, foreign_key="usuario.id")
    expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class Usuario(SQLModel, table=True):
    __tablename__ = "usuario"

    id: int | None = Field(default=None, primary_key=True)
    nombre: str
    apellido: Optional[str] = Field(default=None, max_length=80)
    celular: Optional[str] = Field(default=None, max_length=20)
    email: str = Field(unique=True, index=True)
    password_hash: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)

    roles: list[Rol] = Relationship(
        link_model=UsuarioRolLink,
        sa_relationship_kwargs={
            "primaryjoin": "Usuario.id==UsuarioRolLink.usuario_id",
            "secondaryjoin": "Rol.codigo==UsuarioRolLink.rol_codigo",
        },
    )

    @property
    def rol(self) -> str:
        """Retorna el codigo del primer rol asignado. Usado para JWT y respuestas."""
        return self.roles[0].codigo if self.roles else ""


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_token"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="usuario.id", index=True)
    token_hash: str = Field(max_length=64, unique=True, index=True)
    expires_at: datetime = Field(nullable=False)
    revoked_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
