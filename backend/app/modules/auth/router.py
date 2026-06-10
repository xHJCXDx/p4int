from fastapi import APIRouter, Depends, status, Response, Request
from sqlmodel import Session

from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from app.modules.usuarios.schema import UsuarioCreate, UsuarioLogin, UsuarioUpdate, PasswordChange
from app.modules.usuarios.model import Usuario
from app.modules.auth import service

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    user_data: UsuarioCreate,
    session: Session = Depends(get_session)
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
def login(
    credentials: UsuarioLogin,
    response: Response,
    session: Session = Depends(get_session)
) -> ApiResponse:
    user = service.login_user(session, credentials.email, credentials.password)

    if not user:
        return error_response(
            message="Email o contraseña inválidos",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    access_token = service.create_login_token(user)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=60 * ACCESS_TOKEN_EXPIRE_MINUTES
    )

    return success_response(
        data=service.usuario_to_read(user),
        message="Autenticación exitosa"
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
    request: Request,
    response: Response,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Re-emite un access token si el actual sigue siendo válido."""
    token = request.cookies.get("access_token")
    if not token:
        return error_response(message="No autenticado", status_code=401)

    try:
        new_token = service.refresh_access_token(token)
    except Exception:
        return error_response(message="Token inválido o expirado", status_code=401)

    response.set_cookie(
        key="access_token",
        value=new_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=60 * ACCESS_TOKEN_EXPIRE_MINUTES
    )

    return success_response(message="Token renovado exitosamente")


@router.post("/logout")
def logout(response: Response) -> ApiResponse:
    """Cierra la sesión borrando la cookie de acceso."""
    response.delete_cookie(key="access_token")
    return success_response(message="Sesión cerrada exitosamente")
