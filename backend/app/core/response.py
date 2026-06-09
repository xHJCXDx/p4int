from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    """Respuesta estándar para todos los endpoints"""
    success: bool
    message: str
    data: Optional[T] = None
    status_code: int


def success_response(data: Any = None, message: str = "Operación exitosa", status_code: int = 200) -> ApiResponse:
    """Retorna una respuesta exitosa"""
    return ApiResponse(
        success=True,
        message=message,
        data=data,
        status_code=status_code
    )


def error_response(message: str, status_code: int = 400, data: Any = None) -> ApiResponse:
    """Retorna una respuesta de error"""
    return ApiResponse(
        success=False,
        message=message,
        data=data,
        status_code=status_code
    )
