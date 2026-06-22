import os
from typing import Generator

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

# Carga las variables de entorno (.env)
load_dotenv()

# Obtenemos los datos de .env para hacer mas robusto el archivo (cambios a futuro solo se cambian en .env)
user = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")
db = os.getenv("POSTGRES_DB")

# Configuración URL de conexión
DATABASE_URL = os.getenv("DATABASE_URL") or f"postgresql://{user}:{password}@localhost:5432/{db}"

# engine maneja la conexión física con la bd, echo=True imprime todas las consultas SQL en consola
engine = create_engine(DATABASE_URL, echo=True)

# Gestor de sesiones
def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session