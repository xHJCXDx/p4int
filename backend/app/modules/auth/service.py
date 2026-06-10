from typing import Optional
from datetime import timedelta
from sqlmodel import Session
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.schema import UsuarioCreate, UsuarioUpdate, UsuarioRead
from app.core.security import hash_password, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
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


def create_login_token(user: Usuario) -> str:
    """Crea un JWT access token para el usuario autenticado."""
    user_roles = [role.codigo for role in user.roles]
    access_token = create_access_token(
        data={"sub": str(user.id)},
        roles=user_roles,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return access_token


def refresh_access_token(token: str) -> str:
    """Re-emite un access token a partir de uno válido."""
    from app.core.security import verify_token

    payload = verify_token(token)
    user_id = payload.get("sub")
    roles = payload.get("roles", [])

    return create_access_token(
        data={"sub": str(user_id)},
        roles=roles,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
