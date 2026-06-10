from fastapi import APIRouter, Depends, Request, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.rate_limit import limiter
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import get_current_user
from app.modules.usuarios.schema import (
    UsuarioCreate, UsuarioLogin, UsuarioUpdate, PasswordChange,
    TokenResponse, RefreshTokenRequest,
)
from app.modules.usuarios.model import Usuario
from app.modules.auth import service

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/15minutes")
def register(
    request: Request,
    user_data: UsuarioCreate,
    session: Session = Depends(get_session),
) -> ApiResponse:
    try:
        new_user = service.register_user(session, user_data)
        return success_response(
            data=service.usuario_to_read(new_user),
            message="Usuario registrado exitosamente",
            status_code=201
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@router.post("/login")
@limiter.limit("5/15minutes")
def login(
    request: Request,
    credentials: UsuarioLogin,
    session: Session = Depends(get_session),
) -> ApiResponse:
    user = service.login_user(session, credentials.email, credentials.password)

    if not user:
        return error_response(
            message="Email o contraseña inválidos",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    tokens = service.create_login_tokens(session, user)

    return success_response(
        data={
            "user": service.usuario_to_read(user).model_dump(),
            "tokens": tokens.model_dump(),
        },
        message="Autenticación exitosa",
    )


@router.get("/me")
def get_me(current_user: Usuario = Depends(get_current_user)) -> ApiResponse:
    return success_response(
        data=service.usuario_to_read(current_user),
        message="Datos del usuario obtenidos"
    )


@router.put("/me")
def update_me(
    update_data: UsuarioUpdate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> ApiResponse:
    try:
        updated_user = service.update_user(session, current_user, update_data)
        return success_response(
            data=service.usuario_to_read(updated_user),
            message="Perfil actualizado exitosamente"
        )
    except ValueError as e:
        return error_response(message=str(e), status_code=400)


@router.put("/me/password")
def change_password(
    data: PasswordChange,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> ApiResponse:
    error = service.change_password(session, current_user, data.current_password, data.new_password)
    if error:
        return error_response(message=error, status_code=400)
    return success_response(message="Contraseña actualizada exitosamente")


@router.post("/refresh")
def refresh_token(
    body: RefreshTokenRequest,
    session: Session = Depends(get_session),
) -> ApiResponse:
    """Emite nuevo par de tokens a partir de un refresh_token válido."""
    try:
        tokens = service.refresh_from_token(session, body.refresh_token)
        return success_response(
            data=tokens.model_dump(),
            message="Token renovado exitosamente",
        )
    except (ValueError, Exception):
        return error_response(message="Refresh token inválido o expirado", status_code=401)


@router.post("/logout")
def logout(
    body: RefreshTokenRequest,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Cierra la sesión. Revoca el refresh token."""
    service.revoke_refresh_token(session, body.refresh_token)
    return success_response(message="Sesión cerrada exitosamente")
