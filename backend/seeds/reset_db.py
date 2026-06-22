from dotenv import load_dotenv

load_dotenv()

from sqlmodel import SQLModel, Session, text

from backend.core.database import engine
from backend.core.links import (  # noqa: F401
    ProductoCategoriaLink,
    ProductoIngredienteCantidadLink,
    ProductoIngredienteLink,
)
from backend.modules.auth.models import RefreshToken, Usuario  # noqa: F401
from backend.modules.categorias.models import Categoria  # noqa: F401
from backend.modules.direcciones.models import DireccionEntrega  # noqa: F401
from backend.modules.ingredientes.models import Ingrediente  # noqa: F401
from backend.modules.pedidos.models import (  # noqa: F401
    DetallePedido,
    EstadoPedido,
    FormaPago,
    HistorialEstadoPedido,
    Pedido,
)
from backend.modules.productos.models import Producto  # noqa: F401
from backend.seeds.seed_data import run_all_seeds


def reset_and_seed() -> None:
    print("Borrando todas las tablas...")
    with Session(engine) as session:
        session.exec(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        session.commit()
    print("Creando tablas nuevamente...")
    SQLModel.metadata.create_all(engine)
    print("Ejecutando seeds...")
    with Session(engine) as session:
        run_all_seeds(session)
    print("¡Base de datos reseteada y re-poblada con éxito!")


if __name__ == "__main__":
    reset_and_seed()
