from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlmodel import Session
from app.core.database import create_db_and_tables, engine
from app.core.rate_limit import limiter
from app.modules.categorias.router import router as categoria_router
from app.modules.productos.router import router as producto_router
from app.modules.ingredientes.router import router as ingrediente_router
from app.modules.pedidos.router import router as pedidos_router
from app.modules.pagos.router import router as pagos_router
from app.modules.auth.router import router as auth_router
from app.modules.direcciones.router import router as direccion_router
from app.admin.router import router as admin_router
from app.modules.catalogo.model import UnidadMedida, FormaPago, EstadoPedido  # noqa: F401 — force table registration
from app.modules.pagos.model import Pago  # noqa: F401 — force table registration
from app.modules.catalogo.router import router as catalogo_router
from app.modules.uploads.router import router as uploads_router
from app.modules.usuarios.seed import seed_roles, seed_users
from app.modules.catalogo.seed import seed_catalogos
from app.modules.ingredientes.seed import seed_ingredientes
from app.modules.categorias.seed import seed_categorias
from app.modules.productos.seed import seed_productos


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        seed_roles(session)
        seed_catalogos(session)
        seed_users(session)
        ingredientes = seed_ingredientes(session)
        categorias = seed_categorias(session)
        seed_productos(session, categorias, ingredientes)
    yield

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(direccion_router)
app.include_router(admin_router)
app.include_router(categoria_router)
app.include_router(producto_router)
app.include_router(ingrediente_router)
app.include_router(pedidos_router)
app.include_router(pagos_router)
app.include_router(catalogo_router)
app.include_router(uploads_router)

@app.get("/")
def read_root():
    return {"message": "API de Productos y Categorías"}
