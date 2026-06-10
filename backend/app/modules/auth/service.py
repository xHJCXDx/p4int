from typing import Optional
from datetime import timedelta
from sqlmodel import Session
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.schema import UsuarioCreate, UsuarioUpdate, UsuarioRead, TokenResponse
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.modules.usuarios.unit_of_work import UsuarioUnitOfWork


def usuario_to_read(usuario: Usuario) -> UsuarioRead:
    return UsuarioRead(
        id=usuario.id,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        email=usuario.email,
        celular=usuario.celular,
        roles=[{"codigo": r.codigo, "nombre": r.nombre, "descripcion": r.descripcion} for r in usuario.roles],
        created_at=usuario.created_at.isoformat()
    )


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


def create_login_tokens(user: Usuario) -> TokenResponse:
    """Crea access + refresh tokens para el usuario autenticado."""
    user_roles = [role.codigo for role in user.roles]
    token_data = {"sub": str(user.id)}

    access_token = create_access_token(
        data=token_data,
        roles=user_roles,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh = create_refresh_token(data=token_data, roles=user_roles)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def refresh_from_token(refresh_token_str: str) -> TokenResponse:
    """Valida un refresh token y emite un nuevo par access + refresh."""
    payload = verify_token(refresh_token_str)

    if payload.get("type") != "refresh":
        raise ValueError("Se requiere un refresh token")

    user_id = payload.get("sub")
    roles = payload.get("roles", [])
    token_data = {"sub": str(user_id)}

    access_token = create_access_token(
        data=token_data,
        roles=roles,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh = create_refresh_token(data=token_data, roles=roles)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


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
