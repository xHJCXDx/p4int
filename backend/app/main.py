from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session
from app.core.database import create_db_and_tables, engine
from app.modules.categoria.router import router as categoria_router
from app.modules.producto.router import router as producto_router
from app.modules.ingrediente.router import router as ingrediente_router
from app.modules.venta.router import router as venta_router
from app.modules.usuario.router import router as auth_router
from app.modules.direccion.router import router as direccion_router
from app.admin.router import router as admin_router
from app.modules.catalogo.model import UnidadMedida, FormaPago, EstadoPedido  # noqa: F401 — force table registration
from app.modules.catalogo.router import router as catalogo_router
from app.modules.usuario.seed import seed_roles, seed_users
from app.modules.catalogo.seed import seed_catalogos
from app.modules.ingrediente.seed import seed_ingredientes
from app.modules.categoria.seed import seed_categorias
from app.modules.producto.seed import seed_productos


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
app.include_router(venta_router)
app.include_router(catalogo_router)

@app.get("/")
def read_root():
    return {"message": "API de Productos y Categorías"}
