from sqlmodel import Session
from app.modules.usuarios.model import Rol, Usuario
from app.core.security import hash_password
from app.core.constants import ROLES
from app.modules.usuarios.unit_of_work import UsuarioUnitOfWork


def seed_roles(session: Session) -> None:
    """Seed de roles obligatorios."""
    with UsuarioUnitOfWork(session) as uow:
        for role_data in ROLES:
            existing = uow.usuarios.get_rol(role_data["codigo"])
            if not existing:
                new_role = Rol(codigo=role_data["codigo"], nombre=role_data["nombre"], descripcion=role_data["descripcion"])
                uow.usuarios.create_rol(new_role)


def seed_users(session: Session) -> None:
    """Seed de usuarios por defecto para cada rol."""
    users_data = [
        {"nombre": "Admin", "apellido": "Sistema", "email": "admin@admin.com", "password": "admin123", "rol": "ADMIN"},
        {"nombre": "Cliente", "apellido": "Demo", "email": "cliente@test.com", "password": "cliente123", "rol": "CLIENT"},
        {"nombre": "Empleado", "apellido": "Pedidos", "email": "empleado@tienda.com", "password": "empleado123", "rol": "PEDIDOS"},
        {"nombre": "Gerente", "apellido": "Stock", "email": "gerente@tienda.com", "password": "gerente123", "rol": "STOCK"},
    ]

    with UsuarioUnitOfWork(session) as uow:
        for user_data in users_data:
            existing = uow.usuarios.get_by_email(user_data["email"])
            if not existing:
                user = Usuario(
                    nombre=user_data["nombre"],
                    apellido=user_data["apellido"],
                    email=user_data["email"],
                    password_hash=hash_password(user_data["password"])
                )
                uow.usuarios.create(user)
                uow.usuarios.flush()

                rol = uow.usuarios.get_rol(user_data["rol"])
                if rol:
                    uow.usuarios.assign_role(user.id, rol.codigo)
