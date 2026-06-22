from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RegisterRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    apellido: str | None = Field(default=None, max_length=80)
    celular: str | None = Field(default=None, max_length=20)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: int
    nombre: str
    apellido: str | None = None
    celular: str | None = None
    email: EmailStr
    rol: str
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=16, max_length=512)
