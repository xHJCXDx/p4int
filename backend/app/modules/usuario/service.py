from typing import Optional, Tuple, List
from sqlmodel import Session
from app.modules.usuario.model import Usuario
from app.modules.usuario.schema import UsuarioCreate, UsuarioUpdate, UsuarioRead
from app.core.security import hash_password, verify_password
from app.modules.usuario.unit_of_work import UsuarioUnitOfWork


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


def get_all_paginado(session: Session, limit: int = 10, offset: int = 0, rol_codigo: Optional[str] = None) -> Tuple[List[Usuario], int]:
    """Obtiene usuarios paginados, opcionalmente filtrando por rol."""
    with UsuarioUnitOfWork(session) as uow:
        return uow.usuarios.get_all_paginado(rol_codigo=rol_codigo, limit=limit, offset=offset)


def get_user_by_id(session: Session, user_id: int) -> Optional[Usuario]:
    """Obtiene un usuario por ID."""
    with UsuarioUnitOfWork(session) as uow:
        return uow.usuarios.get_by_id(user_id)


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


def update_user_admin(session: Session, usuario_id: int, update_data: UsuarioUpdate) -> Optional[Usuario]:
    """Actualiza un usuario desde el panel admin. Retorna None si no existe."""
    with UsuarioUnitOfWork(session) as uow:
        usuario = uow.usuarios.get_by_id(usuario_id)
        if not usuario:
            return None
        update_dict = update_data.model_dump(exclude_unset=True)
        uow.usuarios.update(usuario, update_dict)
    return usuario


def delete_user(session: Session, usuario_id: int) -> Optional[str]:
    """Soft delete de un usuario. Retorna error si no existe, None si ok."""
    with UsuarioUnitOfWork(session) as uow:
        usuario = uow.usuarios.get_by_id(usuario_id)
        if not usuario:
            return "Usuario no encontrado"
        uow.usuarios.delete(usuario)
    return None


def assign_role(session: Session, usuario_id: int, rol_codigo: str) -> Tuple[Optional[Usuario], Optional[str]]:
    """Asigna un rol a un usuario. Retorna (usuario, error_message)."""
    with UsuarioUnitOfWork(session) as uow:
        usuario = uow.usuarios.get_by_id(usuario_id)
        if not usuario:
            return None, "Usuario no encontrado"

        rol = uow.usuarios.get_rol(rol_codigo)
        if not rol:
            return None, "Rol no encontrado"

        error = uow.usuarios.assign_role(usuario_id, rol_codigo)
        if error:
            return None, error

        uow.usuarios.refresh(usuario)
    return usuario, None
