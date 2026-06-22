from dotenv import load_dotenv

load_dotenv()

from sqlmodel import SQLModel, Session

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


def main() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        run_all_seeds(session)


if __name__ == "__main__":
    main()
