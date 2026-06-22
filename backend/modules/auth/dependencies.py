from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.auth.models import Usuario
from backend.modules.auth.repositories import UsuarioRepository
from backend.modules.auth.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    access_token_cookie: str | None = Cookie(default=None, alias="access_token"),
    session: Session = Depends(get_session),
) -> Usuario:
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalido o expirado",
    )

    bearer_token = credentials.credentials if credentials else None
    cookie_token = access_token_cookie
    if not bearer_token and not cookie_token:
        raise auth_error

    user_id: int | None = None
    last_error: Exception | None = None

    # Probamos primero Bearer y luego cookie. Si uno es valido, autenticamos.
    for raw_token in (bearer_token, cookie_token):
        if not raw_token:
            continue
        try:
            payload = decode_access_token(raw_token)
            user_id = int(payload.get("sub"))
            break
        except Exception as exc:
            last_error = exc

    if user_id is None:
        raise auth_error from last_error

    user = UsuarioRepository(session).get_by_id(user_id)
    if not user or not user.is_active:
        raise auth_error

    return user


def require_roles(*allowed_roles: str):
    roles_txt = " o ".join(allowed_roles)

    def dependency(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere rol {roles_txt}",
            )
        return current_user

    return dependency
