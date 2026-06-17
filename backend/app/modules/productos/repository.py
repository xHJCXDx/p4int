from typing import List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, timezone
from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload
from app.core.repository import BaseRepository
from app.modules.productos.model import Producto, ProductoIngredienteLink, ProductoCategoriaLink
from app.modules.categorias.model import Categoria
from app.modules.ingredientes.model import Ingrediente


class ProductoRepository(BaseRepository[Producto]):
    """Repository for Producto entity with soft delete support"""

    def __init__(self, session: Session):
        super().__init__(session, Producto)

    def get_all(
        self,
        limit: int = 100,
        offset: int = 0,
        busqueda: Optional[str] = None,
        categoria_id: Optional[int] = None,
        disponible: Optional[bool] = None,
    ) -> Tuple[List[Producto], int]:
        """Get all productos (excluding soft-deleted) with filters and pagination"""
        statement = select(Producto).where(Producto.deleted_at.is_(None)).options(
            selectinload(Producto.categorias),
            selectinload(Producto.ingredientes),
        )

        count_statement = select(func.count(Producto.id)).where(Producto.deleted_at.is_(None))

        if busqueda:
            statement = statement.where(Producto.nombre.ilike(f"%{busqueda}%"))
            count_statement = count_statement.where(Producto.nombre.ilike(f"%{busqueda}%"))

        if categoria_id is not None:
            statement = statement.join(ProductoCategoriaLink).where(
                ProductoCategoriaLink.categoria_id == categoria_id
            )
            count_statement = count_statement.join(ProductoCategoriaLink).where(
                ProductoCategoriaLink.categoria_id == categoria_id
            )

        if disponible is not None:
            statement = statement.where(Producto.disponible == disponible)
            count_statement = count_statement.where(Producto.disponible == disponible)

        total = self.session.exec(count_statement).one()
        statement = statement.offset(offset).limit(limit)
        items = self.session.exec(statement).unique().all()

        return items, total

    def get_by_nombre(self, nombre: str) -> Optional[Producto]:
        """Obtiene un producto por nombre."""
        statement = select(Producto).where(Producto.nombre == nombre)
        return self.session.exec(statement).first()

    def get_by_id(self, producto_id: int) -> Optional[Producto]:
        """Get producto by ID (returns None if soft-deleted)"""
        producto = self.session.get(Producto, producto_id)
        if producto and producto.deleted_at is not None:
            return None
        return producto

    def get_by_id_with_relations(self, producto_id: int) -> Optional[Producto]:
        """Get producto by ID with eager-loaded relations"""
        statement = (
            select(Producto)
            .where(Producto.id == producto_id, Producto.deleted_at.is_(None))
            .options(selectinload(Producto.categorias), selectinload(Producto.ingredientes))
        )
        return self.session.exec(statement).first()

    def create(self, producto: Producto, categoria_ids: List[int] = None, ingredientes_data: list = None) -> Producto:
        if categoria_ids:
            for cat_id in categoria_ids:
                categoria = self.session.get(Categoria, cat_id)
                if categoria:
                    producto.categorias.append(categoria)

        self.session.add(producto)
        self.session.flush()

        if ingredientes_data:
            for ing_data in ingredientes_data:
                ingrediente = self.session.get(Ingrediente, ing_data.ingrediente_id)
                if ingrediente:
                    link = ProductoIngredienteLink(
                        producto_id=producto.id,
                        ingrediente_id=ing_data.ingrediente_id,
                        cantidad=ing_data.cantidad,
                        unidad_medida_id=ing_data.unidad_medida_id,
                        es_removible=ing_data.es_removible,
                    )
                    self.session.add(link)

        self.session.flush()
        return producto

    def update(self, db_producto: Producto, producto_data: dict, categoria_ids: List[int] = None, ingredientes_data: list = None) -> Producto:
        if categoria_ids is not None:
            existing_cat_links = self.session.exec(
                select(ProductoCategoriaLink).where(
                    ProductoCategoriaLink.producto_id == db_producto.id
                )
            ).all()
            for link in existing_cat_links:
                self.session.delete(link)
            self.session.flush()

            for cat_id in categoria_ids:
                categoria = self.session.get(Categoria, cat_id)
                if categoria:
                    link = ProductoCategoriaLink(producto_id=db_producto.id, categoria_id=cat_id)
                    self.session.add(link)

        if ingredientes_data is not None:
            existing_links = self.session.exec(
                select(ProductoIngredienteLink).where(
                    ProductoIngredienteLink.producto_id == db_producto.id
                )
            ).all()
            for link in existing_links:
                self.session.delete(link)
            self.session.flush()

            for ing_data in ingredientes_data:
                ingrediente = self.session.get(Ingrediente, ing_data.ingrediente_id)
                if ingrediente:
                    link = ProductoIngredienteLink(
                        producto_id=db_producto.id,
                        ingrediente_id=ing_data.ingrediente_id,
                        cantidad=ing_data.cantidad,
                        unidad_medida_id=ing_data.unidad_medida_id,
                        es_removible=ing_data.es_removible,
                    )
                    self.session.add(link)

        return super().update(db_producto, producto_data)

    def create_categoria_link(self, producto_id: int, categoria_id: int, es_principal: bool = False) -> None:
        """Crea un link producto-categoría."""
        link = ProductoCategoriaLink(producto_id=producto_id, categoria_id=categoria_id, es_principal=es_principal)
        self.session.add(link)

    def create_ingrediente_link(self, producto_id: int, ingrediente_id: int, cantidad: Decimal, unidad_medida_id: int = 1, es_removible: bool = False) -> None:
        """Crea un link producto-ingrediente."""
        link = ProductoIngredienteLink(
            producto_id=producto_id,
            ingrediente_id=ingrediente_id,
            cantidad=cantidad,
            unidad_medida_id=unidad_medida_id,
            es_removible=es_removible,
        )
        self.session.add(link)

    def get_ingrediente_links(self, producto_id: int) -> List[ProductoIngredienteLink]:
        """Obtiene los links producto-ingrediente con cantidad"""
        statement = select(ProductoIngredienteLink).where(
            ProductoIngredienteLink.producto_id == producto_id
        )
        return list(self.session.exec(statement).all())

    def delete(self, db_producto: Producto) -> None:
        """Soft delete a producto"""
        db_producto.deleted_at = datetime.now(timezone.utc)
        self.session.add(db_producto)
