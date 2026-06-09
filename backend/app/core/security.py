"""Seguridad: JWT, hash de contraseñas, y dependencies de autenticación."""

import os
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request
from sqlmodel import Session

from app.core.database import get_session

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "123456")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


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



def get_current_user(request: Request, session: Session = Depends(get_session)):
    """
    Dependency que extrae el usuario actual del JWT token en la cookie.
    Importa Usuario aquí para evitar circular imports.
    """
    from app.modules.usuario.unit_of_work import UsuarioUnitOfWork

    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado"
        )

    payload = verify_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

    user_id = int(sub)

    with UsuarioUnitOfWork(session) as uow:
        user = uow.usuarios.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
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
