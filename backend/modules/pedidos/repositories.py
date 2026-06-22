from sqlalchemy import exists, func, not_
from sqlmodel import Session, select

from backend.core.repository import BaseRepository
from backend.core.links import ProductoCategoriaLink, ProductoIngredienteLink
from backend.modules.categorias.models import Categoria
from backend.modules.pagos.models import Pago
from backend.modules.pedidos.models import (
    DetallePedido,
    FormaPago,
    HistorialEstadoPedido,
    Pedido,
)


class FormaPagoRepository(BaseRepository[FormaPago]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, FormaPago)

    def get_by_codigo(self, codigo: str) -> FormaPago | None:
        return self.session.exec(
            select(FormaPago).where(FormaPago.codigo == codigo)
        ).first()

    def get_all_habilitados(self) -> list[FormaPago]:
        return list(
            self.session.exec(
                select(FormaPago).where(FormaPago.habilitado == True)
            ).all()
        )


class PedidoRepository(BaseRepository[Pedido]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Pedido)

    def get_by_id(self, record_id: int) -> Pedido | None:
        return self.session.exec(
            select(Pedido)
            .where(Pedido.id == record_id)
            .where(Pedido.deleted_at.is_(None))
        ).first()

    def get_paginated(
        self,
        offset: int,
        limit: int,
        usuario_id: int | None = None,
    ) -> tuple[int, list[Pedido]]:
        """
        Si usuario_id es None devuelve todos los pedidos (ADMIN/PEDIDOS).
        Si usuario_id tiene valor devuelve solo los del cliente.
        """
        mp_pago_aprobado = exists(
            select(Pago.id).where(
                Pago.pedido_id == Pedido.id,
                Pago.mp_status == "approved",
            )
        )
        mp_pendiente_sin_pago_aprobado = (
            (Pedido.forma_pago_codigo == "MERCADOPAGO")
            & (Pedido.estado_codigo == "PENDIENTE")
            & not_(mp_pago_aprobado)
        )
        q = select(Pedido).where(Pedido.deleted_at.is_(None)).where(not_(mp_pendiente_sin_pago_aprobado))

        if usuario_id is not None:
            q = q.where(Pedido.usuario_id == usuario_id)

        q = q.order_by(Pedido.created_at.desc())

        total = self.session.exec(
            select(func.count()).select_from(q.subquery())
        ).one()

        items = list(self.session.exec(q.offset(offset).limit(limit)).all())
        return total, items

    def get_categoria_nombres_by_producto(self, producto_id: int) -> list[str]:
        return list(
            self.session.exec(
                select(Categoria.nombre)
                .join(ProductoCategoriaLink, ProductoCategoriaLink.categoria_id == Categoria.id)
                .where(ProductoCategoriaLink.producto_id == producto_id)
            ).all()
        )

    def get_ingrediente_ids_by_producto(self, producto_id: int) -> set[int]:
        rows = self.session.exec(
            select(ProductoIngredienteLink.ingrediente_id).where(
                ProductoIngredienteLink.producto_id == producto_id
            )
        ).all()
        return {int(row) for row in rows}

    def get_receta_by_producto(self, producto_id: int) -> list[ProductoIngredienteLink]:
        return list(
            self.session.exec(
                select(ProductoIngredienteLink).where(
                    ProductoIngredienteLink.producto_id == producto_id
                )
            ).all()
        )


class DetallePedidoRepository:
    """
    Repositorio para DetallePedido.
    No hereda BaseRepository porque la tabla tiene PK compuesta
    (pedido_id, producto_id) sin id surrogate.
    """

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_pedido(self, pedido_id: int) -> list[DetallePedido]:
        return list(
            self.session.exec(
                select(DetallePedido).where(DetallePedido.pedido_id == pedido_id)
            ).all()
        )

    def add(self, detalle: DetallePedido) -> DetallePedido:
        self.session.add(detalle)
        self.session.flush()
        self.session.refresh(detalle)
        return detalle


class HistorialEstadoPedidoRepository:
    """
    Repositorio append-only: solo INSERT y SELECT, nunca UPDATE ni DELETE.
    """

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_pedido(self, pedido_id: int) -> list[HistorialEstadoPedido]:
        return list(
            self.session.exec(
                select(HistorialEstadoPedido)
                .where(HistorialEstadoPedido.pedido_id == pedido_id)
                .order_by(HistorialEstadoPedido.created_at.asc())
            ).all()
        )

    def add(self, entrada: HistorialEstadoPedido) -> HistorialEstadoPedido:
        self.session.add(entrada)
        self.session.flush()
        self.session.refresh(entrada)
        return entrada
