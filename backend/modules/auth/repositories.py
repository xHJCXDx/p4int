from sqlalchemy import func
from sqlmodel import Session, select

from backend.core.repository import BaseRepository
from backend.modules.auth.models import RefreshToken, Rol, Usuario, UsuarioRolLink


class RolRepository(BaseRepository[Rol]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Rol)

    def get_by_codigo(self, codigo: str) -> Rol | None:
        return self.session.exec(
            select(Rol).where(Rol.codigo == codigo)
        ).first()

    def get_by_nombre(self, nombre: str) -> Rol | None:
        return self.get_by_codigo(nombre)


class UsuarioRepository(BaseRepository[Usuario]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Usuario)

    def get_by_email(self, email: str) -> Usuario | None:
        """Busca por email. Solo usuarios no eliminados (deleted_at IS NULL)."""
        return self.session.exec(
            select(Usuario)
            .where(Usuario.email == email)
            .where(Usuario.deleted_at.is_(None))
        ).first()

    def get_by_id(self, record_id: int) -> Usuario | None:
        """Sobreescribe el base para excluir soft-deleted."""
        return self.session.exec(
            select(Usuario)
            .where(Usuario.id == record_id)
            .where(Usuario.deleted_at.is_(None))
        ).first()

    def get_paginated(
        self,
        offset: int,
        limit: int,
        rol: str | None = None,
    ) -> tuple[int, list[Usuario]]:
        """
        Listado paginado de usuarios. Filtra opcionalmente por nombre de rol
        mediante join con usuario_rol y rol.
        """
        q = select(Usuario).where(Usuario.deleted_at.is_(None))

        if rol is not None:
            q = (
                q.join(UsuarioRolLink, Usuario.id == UsuarioRolLink.usuario_id)
                .join(Rol, UsuarioRolLink.rol_codigo == Rol.codigo)
                .where(Rol.codigo == rol)
            )

        q = q.order_by(Usuario.created_at.desc())

        total = self.session.exec(
            select(func.count()).select_from(q.subquery())
        ).one()

        items = list(self.session.exec(q.offset(offset).limit(limit)).all())
        return total, items

    def get_role_links(self, usuario_id: int) -> list[UsuarioRolLink]:
        return list(
            self.session.exec(
                select(UsuarioRolLink).where(UsuarioRolLink.usuario_id == usuario_id)
            ).all()
        )

    def delete_role_link(self, link: UsuarioRolLink) -> None:
        self.session.delete(link)

    def add_role_link(self, link: UsuarioRolLink) -> None:
        self.session.add(link)


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, RefreshToken)

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self.session.exec(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        ).first()

    def get_active_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self.session.exec(
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .where(RefreshToken.revoked_at.is_(None))
        ).first()
