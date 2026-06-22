from sqlmodel import Session

from backend.modules.auth.repositories import RefreshTokenRepository, RolRepository, UsuarioRepository
from backend.modules.categorias.repositories import CategoriaRepository
from backend.modules.direcciones.repositories import DireccionEntregaRepository
from backend.modules.ingredientes.repositories import IngredienteRepository
from backend.modules.pagos.repositories import PagoRepository
from backend.modules.pedidos.repositories import (
    DetallePedidoRepository,
    FormaPagoRepository,
    HistorialEstadoPedidoRepository,
    PedidoRepository,
)
from backend.modules.productos.repositories import ProductoRepository


class UnitOfWork:
    """
    Gestiona la transaccion de base de datos.

    El UoW es la unica capa que llama a commit() y rollback().
    Los repositorios usan flush() para obtener IDs sin confirmar cambios.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

        self.categorias = CategoriaRepository(self._session)
        self.ingredientes = IngredienteRepository(self._session)
        self.productos = ProductoRepository(self._session)
        self.roles = RolRepository(self._session)
        self.usuarios = UsuarioRepository(self._session)
        self.refresh_tokens = RefreshTokenRepository(self._session)
        self.direcciones = DireccionEntregaRepository(self._session)
        self.formas_pago = FormaPagoRepository(self._session)
        self.pedidos = PedidoRepository(self._session)
        self.detalles_pedido = DetallePedidoRepository(self._session)
        self.historial_pedido = HistorialEstadoPedidoRepository(self._session)
        self.pagos = PagoRepository(self._session)

    def __enter__(self) -> "UnitOfWork":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is None:
            self._session.commit()
        else:
            self._session.rollback()
        self._session.close()

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def flush(self) -> None:
        self._session.flush()

    def refresh(self, instance: object) -> None:
        self._session.refresh(instance)
