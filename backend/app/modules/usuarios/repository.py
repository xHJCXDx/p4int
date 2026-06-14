"""Repository para Usuario."""

from typing import Optional, List
from datetime import datetime, timezone
from sqlmodel import Session, select, func
from app.core.repository import BaseRepository
from app.modules.usuarios.model import Usuario, Rol, UsuarioRolLink, RefreshToken


class UsuarioRepository(BaseRepository[Usuario]):
    """Repository especializado para Usuario con soft delete."""

    def __init__(self, session: Session):
        super().__init__(session, Usuario)

    def get_by_id(self, usuario_id: int) -> Optional[Usuario]:
        """Obtiene usuario por ID (excluye eliminados)."""
        usuario = self.session.get(Usuario, usuario_id)
        if usuario and usuario.deleted_at is not None:
            return None
        return usuario

    def get_by_email(self, email: str) -> Optional[Usuario]:
        """Obtiene un usuario por email (excluye eliminados)."""
        statement = select(Usuario).where(
            (Usuario.email == email) & (Usuario.deleted_at.is_(None))
        )
        return self.session.exec(statement).first()

    def get_all_paginado(self, rol_codigo: Optional[str] = None, limit: int = 100, offset: int = 0) -> tuple[List[Usuario], int]:
        """Obtiene usuarios paginados, opcionalmente filtrando por rol."""
        statement = select(Usuario).where(Usuario.deleted_at.is_(None))
        count_statement = select(func.count(Usuario.id)).where(Usuario.deleted_at.is_(None))

        if rol_codigo:
            statement = statement.join(UsuarioRolLink).where(UsuarioRolLink.rol_codigo == rol_codigo)
            count_statement = count_statement.join(UsuarioRolLink).where(UsuarioRolLink.rol_codigo == rol_codigo)

        total = self.session.exec(count_statement).one()
        statement = statement.offset(offset).limit(limit)
        items = self.session.exec(statement).all()

        return items, total

    def get_all_roles(self) -> list[Rol]:
        """Obtiene todos los roles del sistema."""
        return list(self.session.exec(select(Rol)).all())

    def get_rol(self, codigo: str) -> Optional[Rol]:
        """Obtiene un rol por código."""
        return self.session.get(Rol, codigo)

    def create_rol(self, rol: Rol) -> Rol:
        """Crea un nuevo rol."""
        self.session.add(rol)
        return rol

    def assign_role(self, usuario_id: int, rol_codigo: str) -> Optional[str]:
        """Asigna un rol a un usuario. Retorna error message si ya lo tiene, None si ok."""
        existing = self.session.exec(
            select(UsuarioRolLink).where(
                (UsuarioRolLink.usuario_id == usuario_id) & (UsuarioRolLink.rol_codigo == rol_codigo)
            )
        ).first()
        if existing:
            return "El usuario ya tiene este rol"

        usuario_rol = UsuarioRolLink(usuario_id=usuario_id, rol_codigo=rol_codigo)
        self.session.add(usuario_rol)
        return None

    def delete(self, usuario: Usuario) -> None:
        """Soft delete de un usuario."""
        usuario.deleted_at = datetime.now(timezone.utc)
        self.session.add(usuario)

    def create_refresh_token(self, refresh_token: RefreshToken) -> RefreshToken:
        """Persiste un refresh token en la DB."""
        self.session.add(refresh_token)
        return refresh_token

    def get_active_refresh_token(self, token_hash: str) -> Optional[RefreshToken]:
        """Obtiene un refresh token activo (no revocado) por hash."""
        statement = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
        )
        return self.session.exec(statement).first()

    def revoke_refresh_token(self, stored: RefreshToken) -> None:
        """Revoca un refresh token."""
        stored.revoked_at = datetime.now(timezone.utc)
        self.session.add(stored)
