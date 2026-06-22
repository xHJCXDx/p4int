from backend.core.database import engine
from sqlmodel import Session
from backend.modules.productos.models import Producto
from sqlmodel import select

with Session(engine) as session:
    productos = session.exec(select(Producto)).all()
    for p in productos:
        print(f"{p.id} - {p.nombre}: {p.imagenes_url}")
