from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.core.logs import setup_observability
from backend.core.settings import (
    API_V1_PREFIX,
    CORS_ALLOW_ORIGIN_REGEX,
    UPLOADS_DIR,
    cors_origins,
)
from backend.core.startup import lifespan
from backend.modules.admin.routers import router as admin_router
from backend.modules.auth.routers import router as auth_router
from backend.modules.categorias.routers import router as categoria_router
from backend.modules.direcciones.routers import router as direcciones_router
from backend.modules.estadisticas.routers import router as estadisticas_router
from backend.modules.health.routers import router as health_router
from backend.modules.ingredientes.routers import router as ingrediente_router
from backend.modules.pedidos.routers import router as pedidos_router
from backend.modules.productos.routers import router as producto_router
from backend.modules.pagos.routers import router as pagos_router
from backend.modules.uploads.routers import router as uploads_router
from backend.modules.ws.routers import router as ws_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="PI Programacion 4",
        version="1.0.0",
        lifespan=lifespan,
        redirect_slashes=False,  # Evita el 307 que rompe CORS en requests cross-origin
    )

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
    setup_observability(app)

    app.include_router(health_router, prefix=API_V1_PREFIX)
    app.include_router(auth_router, prefix=API_V1_PREFIX)
    app.include_router(categoria_router, prefix=API_V1_PREFIX)
    app.include_router(ingrediente_router, prefix=API_V1_PREFIX)
    app.include_router(producto_router, prefix=API_V1_PREFIX)
    app.include_router(direcciones_router, prefix=API_V1_PREFIX)
    app.include_router(pedidos_router, prefix=API_V1_PREFIX)
    app.include_router(admin_router, prefix=API_V1_PREFIX)
    app.include_router(pagos_router, prefix=API_V1_PREFIX)
    app.include_router(uploads_router, prefix=API_V1_PREFIX)
    app.include_router(estadisticas_router, prefix=API_V1_PREFIX)
    app.include_router(ws_router, prefix=API_V1_PREFIX)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins(),
        allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app


app = create_app()
