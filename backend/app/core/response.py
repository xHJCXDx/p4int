from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel
from fastapi.responses import JSONResponse

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


def paginated_response(
    items: list,
    total: int,
    page: int,
    size: int,
    message: str = "Operación exitosa",
) -> ApiResponse:
    """Respuesta paginada con formato page/size."""
    import math
    return ApiResponse(
        success=True,
        message=message,
        data={
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": math.ceil(total / size) if size > 0 else 0,
        },
        status_code=200,
    )


def error_response(message: str, status_code: int = 400, data: Any = None) -> JSONResponse:
    """Retorna una respuesta de error con el HTTP status code real."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": data,
            "status_code": status_code
        }
    )
