import os

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlmodel import Session

from backend.core.database import get_session
from backend.core.rate_limit import auth_attempt_key, auth_limiter, auth_rate_limit
from backend.modules.auth.dependencies import get_current_user
from backend.modules.auth.models import Usuario
from backend.modules.auth.schemas import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from backend.modules.auth.services import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
ACCESS_MAX_AGE_SECONDS = 60 * 30
REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
_secure_default = ENVIRONMENT in ("production", "prod")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", str(_secure_default)).strip().lower() in ("1", "true", "yes", "on")
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").strip().lower()
if COOKIE_SAMESITE not in ("lax", "strict", "none"):
    COOKIE_SAMESITE = "lax"
if COOKIE_SAMESITE == "none":
    # SameSite=None requiere Secure=true en navegadores modernos.
    COOKIE_SECURE = True


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_MAX_AGE_SECONDS,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_MAX_AGE_SECONDS,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/")


def get_auth_service(session: Session = Depends(get_session)) -> AuthService:
    return AuthService(session)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    data: RegisterRequest,
    _: None = Depends(auth_rate_limit),
    svc: AuthService = Depends(get_auth_service),
):
    return svc.register(data)


@router.post("/login", response_model=TokenResponse)
def login_user(
    data: LoginRequest,
    request: Request,
    response: Response,
    svc: AuthService = Depends(get_auth_service),
):
    key = auth_attempt_key(request, data.email)
    auth_limiter.assert_allowed(key)
    try:
        token_data = svc.login(data)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            auth_limiter.record_failure(key)
        raise
    auth_limiter.reset(key)
    _set_auth_cookies(response, token_data.access_token, token_data.refresh_token)
    return token_data


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    response: Response,
    data: RefreshTokenRequest | None = None,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    svc: AuthService = Depends(get_auth_service),
):
    token_value = data.refresh_token if data else refresh_token
    if not token_value:
        token_value = ""
    token_data = svc.refresh(token_value)
    _set_auth_cookies(response, token_data.access_token, token_data.refresh_token)
    return token_data


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_user(
    response: Response,
    data: RefreshTokenRequest | None = None,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    svc: AuthService = Depends(get_auth_service),
    current_user: Usuario = Depends(get_current_user),
):
    token_value = data.refresh_token if data else refresh_token
    if token_value:
        svc.logout(current_user.id, token_value)
    _clear_auth_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse)
def get_me(current_user: Usuario = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        nombre=current_user.nombre,
        apellido=current_user.apellido,
        celular=current_user.celular,
        email=current_user.email,
        rol=current_user.rol,
        is_active=current_user.is_active,
    )
