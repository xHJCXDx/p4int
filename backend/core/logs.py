import logging
from time import perf_counter

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger("backend.logs")


def setup_observability(app: FastAPI) -> None:
    @app.middleware("http")
    async def log_requests_and_timing(request: Request, call_next):
        start = perf_counter()
        response = None
        try:
            response = await call_next(request)
            return response
        finally:
            duration_ms = (perf_counter() - start) * 1000
            status_code = response.status_code if response else 500
            logger.info(
                "%s %s -> %s %.2fms",
                request.method,
                request.url.path,
                status_code,
                duration_ms,
            )
            if response:
                response.headers["X-Process-Time-ms"] = f"{duration_ms:.2f}"

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning(
            "HTTPException %s %s -> %s %s",
            request.method,
            request.url.path,
            exc.status_code,
            exc.detail,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning("ValidationError %s %s -> %s", request.method, request.url.path, exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("UnhandledException %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error interno del servidor"},
        )
