from http import HTTPStatus
from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel
from fastapi.responses import JSONResponse

T = TypeVar('T')


class BusinessRuleError(Exception):
    """Raised by services when a domain/business rule is violated.

    Carries an RFC-7807-compatible ``code`` (machine-readable) and an HTTP
    ``status_code`` so the router can forward them directly to ``error_response``
    without losing context.
    """

    def __init__(self, detail: str, code: str, status_code: int = 400, field: Optional[str] = None):
        super().__init__(detail)
        self.detail = detail
        self.code = code
        self.status_code = status_code
        self.field = field

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


def error_response(
    detail: str,
    status_code: int = 400,
    code: str = None,
    field: str = None,
    # backward-compat alias so callers using message= still work during migration
    message: str = None,
) -> JSONResponse:
    """Retorna una respuesta de error en formato RFC 7807 Problem Details."""
    _detail = detail if detail is not None else message
    return JSONResponse(
        status_code=status_code,
        content={
            "type": "about:blank",
            "title": HTTPStatus(status_code).phrase,
            "status": status_code,
            "detail": _detail,
            "code": code,
            "field": field,
        }
    )
