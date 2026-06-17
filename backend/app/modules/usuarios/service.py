from typing import Optional, Tuple, List
from sqlmodel import Session
from app.modules.usuarios.model import Usuario
from app.modules.usuarios.schema import UsuarioUpdate, UsuarioRead
from app.modules.usuarios.unit_of_work import UsuarioUnitOfWork
from app.core.response import BusinessRuleError


def usuario_to_read(usuario: Usuario) -> UsuarioRead:
    return UsuarioRead(
        id=usuario.id,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        email=usuario.email,
        celular=usuario.celular,
        roles=[r.codigo for r in usuario.roles],
        created_at=usuario.created_at.isoformat()
    )


def get_all_roles(session: Session):
    """Obtiene todos los roles del sistema."""
    with UsuarioUnitOfWork(session) as uow:
        return uow.usuarios.get_all_roles()


def get_all_paginado(session: Session, limit: int = 10, offset: int = 0, rol_codigo: Optional[str] = None) -> Tuple[List[Usuario], int]:
    """Obtiene usuarios paginados, opcionalmente filtrando por rol."""
    with UsuarioUnitOfWork(session) as uow:
        return uow.usuarios.get_all_paginado(rol_codigo=rol_codigo, limit=limit, offset=offset)


def update_user_admin(session: Session, usuario_id: int, update_data: UsuarioUpdate) -> Optional[Usuario]:
    """Actualiza un usuario desde el panel admin. Retorna None si no existe."""
    with UsuarioUnitOfWork(session) as uow:
        usuario = uow.usuarios.get_by_id(usuario_id)
        if not usuario:
            return None
        update_dict = update_data.model_dump(exclude_unset=True)
        uow.usuarios.update(usuario, update_dict)
    return usuario


def delete_user(session: Session, usuario_id: int) -> None:
    """Soft delete de un usuario. Lanza BusinessRuleError si no existe."""
    with UsuarioUnitOfWork(session) as uow:
        usuario = uow.usuarios.get_by_id(usuario_id)
        if not usuario:
            raise BusinessRuleError(detail="Usuario no encontrado", code="NOT_FOUND", status_code=404)
        uow.usuarios.delete(usuario)


def assign_role(session: Session, usuario_id: int, rol_codigo: str) -> Usuario:
    """Asigna un rol a un usuario. Lanza BusinessRuleError si falla."""
    with UsuarioUnitOfWork(session) as uow:
        usuario = uow.usuarios.get_by_id(usuario_id)
        if not usuario:
            raise BusinessRuleError(detail="Usuario no encontrado", code="NOT_FOUND", status_code=404)

        rol = uow.usuarios.get_rol(rol_codigo)
        if not rol:
            raise BusinessRuleError(detail="Rol no encontrado", code="NOT_FOUND", status_code=404)

        error = uow.usuarios.assign_role(usuario_id, rol_codigo)
        if error:
            raise BusinessRuleError(detail=error, code="VALIDATION_ERROR", status_code=400)

        uow.usuarios.refresh(usuario)
    return usuario
