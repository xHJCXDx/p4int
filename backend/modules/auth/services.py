import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlmodel import Session

from backend.core.unit_of_work import UnitOfWork
from backend.modules.auth.models import RefreshToken, Rol, Usuario, UsuarioRolLink
from backend.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from backend.modules.auth.security import create_access_token, hash_password, verify_password


class AuthService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._refresh_days = 7

    def _build_user_response(self, user: Usuario, rol_nombre: str) -> UserResponse:
        return UserResponse(
            id=user.id,
            nombre=user.nombre,
            apellido=user.apellido,
            celular=user.celular,
            email=user.email,
            rol=rol_nombre,
            is_active=user.is_active,
        )

    def _issue_refresh_token(self, uow: UnitOfWork, user_id: int) -> str:
        plain_token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256(plain_token.encode("utf-8")).hexdigest()
        expires_at = datetime.utcnow() + timedelta(days=self._refresh_days)
        uow.refresh_tokens.add(
            RefreshToken(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
        )
        return plain_token

    def register(self, data: RegisterRequest) -> UserResponse:
        with UnitOfWork(self._session) as uow:
            existing = uow.usuarios.get_by_email(data.email)
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado")

            rol_obj = uow.roles.get_by_codigo(Rol.CLIENT)
            if not rol_obj:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Rol CLIENT no configurado en el sistema",
                )

            user = Usuario(
                nombre=data.nombre,
                apellido=data.apellido,
                celular=data.celular,
                email=data.email,
                password_hash=hash_password(data.password),
            )
            uow.usuarios.add(user)
            uow.usuarios.add_role_link(UsuarioRolLink(usuario_id=user.id, rol_codigo=rol_obj.codigo))
            return self._build_user_response(user, Rol.CLIENT)

    def login(self, data: LoginRequest) -> TokenResponse:
        with UnitOfWork(self._session) as uow:
            user = uow.usuarios.get_by_email(data.email)
            invalid_error = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
            )

            if not user or not user.is_active:
                raise invalid_error

            if not verify_password(data.password, user.password_hash):
                raise invalid_error

            user.updated_at = datetime.utcnow()
            uow.usuarios.add(user)

            rol_nombre = user.rol  # property: lazy-load dentro del UoW
            access_token = create_access_token(user_id=user.id, email=user.email, rol=rol_nombre)
            refresh_token = self._issue_refresh_token(uow, user.id)
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user=self._build_user_response(user, rol_nombre),
            )

    def refresh(self, refresh_token: str) -> TokenResponse:
        with UnitOfWork(self._session) as uow:
            token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
            stored_token = uow.refresh_tokens.get_active_by_hash(token_hash)
            invalid_error = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o expirado",
            )

            if not stored_token:
                raise invalid_error

            if stored_token.expires_at <= datetime.utcnow():
                stored_token.revoked_at = datetime.utcnow()
                uow.refresh_tokens.add(stored_token)
                raise invalid_error

            user = uow.usuarios.get_by_id(stored_token.user_id)
            if not user or not user.is_active:
                raise invalid_error

            stored_token.revoked_at = datetime.utcnow()
            uow.refresh_tokens.add(stored_token)

            rol_nombre = user.rol  # property: lazy-load dentro del UoW
            access_token = create_access_token(user_id=user.id, email=user.email, rol=rol_nombre)
            new_refresh_token = self._issue_refresh_token(uow, user.id)

            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                user=self._build_user_response(user, rol_nombre),
            )

    def logout(self, user_id: int, refresh_token: str) -> None:
        with UnitOfWork(self._session) as uow:
            token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
            stored_token = uow.refresh_tokens.get_active_by_hash(token_hash)

            if not stored_token or stored_token.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token inválido",
                )

            stored_token.revoked_at = datetime.utcnow()
            uow.refresh_tokens.add(stored_token)
