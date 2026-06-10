from typing import Optional, Tuple, List
from sqlmodel import Session
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.schema import UsuarioUpdate, UsuarioRead
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


def get_all_paginado(session: Session, limit: int = 10, offset: int = 0, rol_codigo: Optional[str] = None) -> Tuple[List[Usuario], int]:
    """Obtiene usuarios paginados, opcionalmente filtrando por rol."""
    with UsuarioUnitOfWork(session) as uow:
        return uow.usuarios.get_all_paginado(rol_codigo=rol_codigo, limit=limit, offset=offset)


def get_user_by_id(session: Session, user_id: int) -> Optional[Usuario]:
    """Obtiene un usuario por ID."""
    with UsuarioUnitOfWork(session) as uow:
        return uow.usuarios.get_by_id(user_id)


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
