"""Módulo de Usuario y Autenticación."""

from typing import Optional
from sqlmodel import Session


def fetch_user_by_id(session: Session, user_id: int) -> Optional["Usuario"]:
    """Busca usuario por ID filtrando soft-deleted. Read-only, sin commit.

    Este callable se registra en core/security.py via set_user_fetcher()
    durante el arranque de la app (main.py lifespan).
    """
    from app.modules.usuarios.model import Usuario

    user = session.get(Usuario, user_id)
    if user and user.deleted_at is not None:
        return None
    return user
