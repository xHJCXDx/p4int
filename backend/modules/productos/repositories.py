from sqlalchemy import asc, desc, func, or_
from sqlmodel import Session, select

from backend.core.links import ProductoCategoriaLink, ProductoIngredienteLink
from backend.modules.categorias.models import Categoria
from backend.core.repository import BaseRepository
from backend.modules.pedidos.models import DetallePedido
from backend.modules.productos.models import Producto


class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Producto)

    def get_by_id(self, record_id: int) -> Producto | None:
        """Sobreescribe el base para excluir soft-deleted."""
        return self.session.exec(
            select(Producto)
            .where(Producto.id == record_id)
            .where(Producto.deleted_at.is_(None))
        ).first()

    def get_by_id_any(self, record_id: int) -> Producto | None:
        return self.session.exec(
            select(Producto).where(Producto.id == record_id)
        ).first()

    def get_all_active(self) -> list[Producto]:
        return list(
            self.session.exec(
                select(Producto).where(Producto.is_active == True, Producto.deleted_at == None)
            ).all()
        )

    def get_paginated(
        self,
        offset: int,
        limit: int,
        categoria_id: int | None,
        subcategoria_id: int | None,
        ingrediente_id: int | None,
        ingrediente_ids: list[int],
        disponible: bool | None,
        is_active: bool | None,
        sort_by: str | None,
        sort_dir: str,
        search: str | None,
        include_inactive: bool = False,
    ) -> tuple[int, list[Producto]]:
        q = select(Producto)
        if not include_inactive:
            q = q.where(
                Producto.is_active == True,
                Producto.deleted_at == None,
            )
        elif is_active is not None:
            q = q.where(Producto.is_active == is_active)

        if disponible is not None:
            q = q.where(Producto.disponible == disponible)

        if search:
            pattern = f"%{search}%"
            q = q.where(
                or_(
                    Producto.nombre.ilike(pattern),
                    Producto.descripcion.ilike(pattern),
                )
            )

        categoria_ids: list[int] = []
        if subcategoria_id is not None:
            categoria_ids = [subcategoria_id]
        elif categoria_id is not None:
            categoria_ids = [categoria_id]
            queue = [categoria_id]
            while queue:
                parent = queue.pop()
                children = self.session.exec(
                    select(Categoria.id).where(
                        Categoria.parent_id == parent,
                        Categoria.deleted_at.is_(None),
                    )
                ).all()
                for child_id in children:
                    if child_id not in categoria_ids:
                        categoria_ids.append(child_id)
                        queue.append(child_id)

        if categoria_ids:
            q = q.join(
                ProductoCategoriaLink,
                ProductoCategoriaLink.producto_id == Producto.id,
            ).where(ProductoCategoriaLink.categoria_id.in_(categoria_ids))

        filtros_ingredientes = [iid for iid in ingrediente_ids if iid > 0]
        if ingrediente_id is not None and ingrediente_id > 0:
            filtros_ingredientes.append(ingrediente_id)
        if filtros_ingredientes:
            filtros_ingredientes = sorted(set(filtros_ingredientes))
            productos_con_ingredientes = (
                select(ProductoIngredienteLink.producto_id)
                .where(ProductoIngredienteLink.ingrediente_id.in_(filtros_ingredientes))
                .group_by(ProductoIngredienteLink.producto_id)
                .having(
                    func.count(func.distinct(ProductoIngredienteLink.ingrediente_id))
                    == len(filtros_ingredientes)
                )
            )
            q = q.where(Producto.id.in_(productos_con_ingredientes))

        direction = desc if str(sort_dir).lower() == "desc" else asc
        sort_field = (sort_by or "").lower()
        sort_map = {
            "nombre": Producto.nombre,
            "precio": Producto.precio_base,
        }
        sort_column = sort_map.get(sort_field, Producto.created_at)

        id_q = q.with_only_columns(Producto.id, Producto.is_active, sort_column).distinct()

        total = self.session.exec(
            select(func.count()).select_from(id_q.subquery())
        ).one()

        if include_inactive and is_active is None:
            id_q = id_q.order_by(Producto.is_active.desc(), direction(sort_column))
        else:
            id_q = id_q.order_by(direction(sort_column))

        id_rows = list(self.session.exec(id_q.offset(offset).limit(limit)).all())
        ids = [row[0] if isinstance(row, tuple) else int(row) for row in id_rows]
        if not ids:
            return total, []

        items_raw = list(
            self.session.exec(
                select(Producto).where(Producto.id.in_(ids))
            ).all()
        )
        by_id = {item.id: item for item in items_raw}
        ordered_items = [by_id[item_id] for item_id in ids if item_id in by_id]
        return total, ordered_items

    def get_categoria_links(self, producto_id: int) -> list[ProductoCategoriaLink]:
        return list(
            self.session.exec(
                select(ProductoCategoriaLink).where(ProductoCategoriaLink.producto_id == producto_id)
            ).all()
        )

    def get_ingrediente_links(self, producto_id: int) -> list[ProductoIngredienteLink]:
        return list(
            self.session.exec(
                select(ProductoIngredienteLink).where(ProductoIngredienteLink.producto_id == producto_id)
            ).all()
        )

    def get_ingrediente_cantidades(self, producto_id: int) -> list[ProductoIngredienteLink]:
        return list(
            self.session.exec(
                select(ProductoIngredienteLink).where(
                    ProductoIngredienteLink.producto_id == producto_id
                )
            ).all()
        )

    def get_categoria_link(self, producto_id: int, categoria_id: int) -> ProductoCategoriaLink | None:
        return self.session.exec(
            select(ProductoCategoriaLink).where(
                ProductoCategoriaLink.producto_id == producto_id,
                ProductoCategoriaLink.categoria_id == categoria_id,
            )
        ).first()

    def add_relation(self, relation: ProductoCategoriaLink | ProductoIngredienteLink) -> None:
        self.session.add(relation)

    def delete_relation(self, relation: ProductoCategoriaLink | ProductoIngredienteLink) -> None:
        self.session.delete(relation)

    def has_order_details(self, producto_id: int) -> bool:
        return self.session.exec(
            select(DetallePedido.pedido_id).where(DetallePedido.producto_id == producto_id).limit(1)
        ).first() is not None
