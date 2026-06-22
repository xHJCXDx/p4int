from datetime import date

from sqlmodel import Session

from backend.modules.estadisticas.repositories import EstadisticasRepository
from backend.modules.estadisticas.schemas import (
    EstadisticasResumen,
    IngresoPorFormaPago,
    PedidoPorEstado,
    ProductoTop,
    VentaPorPeriodo,
)


class EstadisticasService:
    def __init__(self, session: Session) -> None:
        self._repo = EstadisticasRepository(session)

    def resumen(self) -> EstadisticasResumen:
        return EstadisticasResumen(**self._repo.resumen())

    def ventas(self, desde: date | None, hasta: date | None) -> list[VentaPorPeriodo]:
        return [VentaPorPeriodo(**item) for item in self._repo.ventas_por_periodo(desde, hasta)]

    def productos_top(self, desde: date | None, hasta: date | None, limit: int) -> list[ProductoTop]:
        return [ProductoTop(**item) for item in self._repo.productos_top(desde, hasta, limit)]

    def pedidos_por_estado(self) -> list[PedidoPorEstado]:
        return [PedidoPorEstado(**item) for item in self._repo.pedidos_por_estado()]

    def ingresos(self, desde: date | None, hasta: date | None) -> list[IngresoPorFormaPago]:
        return [IngresoPorFormaPago(**item) for item in self._repo.ingresos_por_forma_pago(desde, hasta)]
