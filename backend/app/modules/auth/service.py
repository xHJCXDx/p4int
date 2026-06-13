import hashlib
from typing import Optional
from datetime import datetime, timedelta
from sqlmodel import Session
from app.modules.usuarios.model import Usuario, RefreshToken
from app.modules.usuarios.schema import UsuarioCreate, UsuarioUpdate, TokenResponse
from app.modules.usuarios.service import usuario_to_read
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.modules.usuarios.unit_of_work import UsuarioUnitOfWork


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def register_user(session: Session, user_data: UsuarioCreate) -> Usuario:
    """Registra un nuevo usuario y le asigna el rol CLIENT automáticamente."""
    with UsuarioUnitOfWork(session) as uow:
        existing_user = uow.usuarios.get_by_email(user_data.email)
        if existing_user:
            raise ValueError(f"El email {user_data.email} ya está registrado")

        new_user = Usuario(
            nombre=user_data.nombre,
            apellido=user_data.apellido,
            email=user_data.email,
            celular=user_data.celular,
            password_hash=hash_password(user_data.password)
        )
        uow.usuarios.create(new_user)
        uow.usuarios.flush()

        rol_client = uow.usuarios.get_rol("CLIENT")
        if rol_client:
            uow.usuarios.assign_role(new_user.id, rol_client.codigo)

    return new_user


def login_user(session: Session, email: str, password: str) -> Optional[Usuario]:
    """Autentica un usuario con email y contraseña."""
    with UsuarioUnitOfWork(session) as uow:
        user = uow.usuarios.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            return None
        return user


def create_login_tokens(session: Session, user: Usuario) -> TokenResponse:
    """Crea access + refresh tokens y persiste el refresh en DB."""
    user_roles = [role.codigo for role in user.roles]
    token_data = {"sub": str(user.id)}

    access_token = create_access_token(
        data=token_data,
        roles=user_roles,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh = create_refresh_token(data=token_data, roles=user_roles)

    with UsuarioUnitOfWork(session) as uow:
        rt = RefreshToken(
            usuario_id=user.id,
            token_hash=_hash_token(refresh),
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
        uow.usuarios.create_refresh_token(rt)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def refresh_from_token(session: Session, refresh_token_str: str) -> TokenResponse:
    """Valida un refresh token, revoca el viejo, y emite un nuevo par."""
    payload = verify_token(refresh_token_str)

    if payload.get("type") != "refresh":
        raise ValueError("Se requiere un refresh token")

    token_hash = _hash_token(refresh_token_str)

    with UsuarioUnitOfWork(session) as uow:
        stored = uow.usuarios.get_active_refresh_token(token_hash)
        if not stored:
            raise ValueError("Refresh token revocado o no encontrado")

        uow.usuarios.revoke_refresh_token(stored)

        user_id = payload.get("sub")
        roles = payload.get("roles", [])
        token_data = {"sub": str(user_id)}

        access_token = create_access_token(
            data=token_data,
            roles=roles,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        new_refresh = create_refresh_token(data=token_data, roles=roles)

        rt = RefreshToken(
            usuario_id=int(user_id),
            token_hash=_hash_token(new_refresh),
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )
        uow.usuarios.create_refresh_token(rt)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def revoke_refresh_token(session: Session, refresh_token_str: str) -> None:
    """Revoca un refresh token (logout)."""
    token_hash = _hash_token(refresh_token_str)
    with UsuarioUnitOfWork(session) as uow:
        stored = uow.usuarios.get_active_refresh_token(token_hash)
        if stored:
            uow.usuarios.revoke_refresh_token(stored)


def update_user(session: Session, user: Usuario, update_data: UsuarioUpdate) -> Usuario:
    """Actualiza datos del usuario (nombre, apellido, celular)."""
    with UsuarioUnitOfWork(session) as uow:
        update_dict = update_data.model_dump(exclude_unset=True)
        uow.usuarios.update(user, update_dict)
    return user


def change_password(session: Session, user: Usuario, current_password: str, new_password: str) -> Optional[str]:
    """Cambia la contraseña del usuario. Retorna error message si falla, None si ok."""
    if not verify_password(current_password, user.password_hash):
        return "Contraseña actual incorrecta"

    if len(new_password) < 6:
        return "La nueva contraseña debe tener al menos 6 caracteres"

    with UsuarioUnitOfWork(session) as uow:
        uow.usuarios.update(user, {"password_hash": hash_password(new_password)})
    return None
