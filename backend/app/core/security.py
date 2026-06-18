"""Seguridad: JWT, hash de contraseñas, y dependencies de autenticación.

REGLA DE CAPAS: este módulo pertenece a core/ y NO DEBE importar de app.modules/.
La resolución del usuario se delega a un callable registrado desde el módulo usuarios.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Callable, Any
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session  # noqa: F401 — used by user_fetcher signature

from app.core.database import get_session

# JWT Configuration
JWT_SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-min-32-chars")
JWT_ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

bearer_scheme = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# User fetcher registry — módulos registran su implementación via set_user_fetcher
# ---------------------------------------------------------------------------
_user_fetcher: Optional[Callable[[Session, int], Any]] = None


def set_user_fetcher(fetcher: Callable[[Session, int], Any]) -> None:
    """Registra el callable que resuelve un usuario por ID.

    Debe ser invocado UNA VEZ durante el arranque (e.g. en el __init__.py del módulo usuarios).
    El callable recibe (session, user_id) y retorna el usuario o None si no existe / soft-deleted.
    """
    global _user_fetcher
    _user_fetcher = fetcher

def hash_password(plain_password: str) -> str:
    """Hashea una contraseña con bcrypt (cost factor = 12)."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica que una contraseña coincida con su hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))



def create_access_token(data: dict, roles: Optional[List[str]] = None, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un JWT access token. Incluye roles en el payload para evitar joins a la DB."""
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if roles is not None:
        to_encode["roles"] = roles
    to_encode["type"] = "access"
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, roles: Optional[List[str]] = None) -> str:
    """Crea un JWT refresh token con expiración extendida (días)."""
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if roles is not None:
        to_encode["roles"] = roles
    to_encode["type"] = "refresh"
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verifica y decodifica un JWT token."""
    try:
        payload = jwt.decode(
            token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM],
            options={"verify_sub": False}
        )
        if "sub" in payload:
            payload["sub"] = str(payload["sub"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )



def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(get_session),
):
    """Extrae el usuario actual del header Authorization: Bearer <token>.

    La resolución del usuario se delega al callable registrado via set_user_fetcher.
    """
    if _user_fetcher is None:
        raise RuntimeError(
            "User fetcher no registrado. "
            "Llamá a set_user_fetcher() durante el arranque de la app."
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: se requiere access token",
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    user = _user_fetcher(session, int(sub))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )

    return user


def require_roles(*allowed_roles: str):
    """
    Factory que retorna una dependency que valida que el usuario tenga uno de los roles permitidos.
    Uso: @router.get("/admin", dependencies=[Depends(require_roles("ADMIN", "STOCK"))])
    """
    async def check_roles(current_user = Depends(get_current_user)):
        user_roles = [role.codigo for role in current_user.roles]
        if not any(role in user_roles for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para acceder a este recurso"
            )
        return current_user

    return check_roles
