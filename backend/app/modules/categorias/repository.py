from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlmodel import Session, select, func
from app.core.repository import BaseRepository
from app.modules.categorias.model import Categoria


class CategoriaRepository(BaseRepository[Categoria]):
    """Repository for Categoria entity with soft delete support"""

    def __init__(self, session: Session):
        super().__init__(session, Categoria)

    def get_all(self, limit: int = 100, offset: int = 0) -> Tuple[List[Categoria], int]:
        """Get all categorias (excluding soft-deleted) with pagination"""
        statement = select(Categoria).where(Categoria.deleted_at.is_(None)).offset(offset).limit(limit)
        items = self.session.exec(statement).all()

        count_statement = select(func.count(Categoria.id)).where(Categoria.deleted_at.is_(None))
        total = self.session.exec(count_statement).one()

        return items, total

    def get_all_by_parent(self, parent_id: int, limit: int = 100, offset: int = 0) -> Tuple[List[Categoria], int]:
        """Get categorias by parent_id (excluding soft-deleted) with pagination"""
        statement = (
            select(Categoria)
            .where(Categoria.parent_id == parent_id, Categoria.deleted_at.is_(None))
            .offset(offset).limit(limit)
        )
        items = self.session.exec(statement).all()

        count_statement = select(func.count(Categoria.id)).where(
            Categoria.parent_id == parent_id, Categoria.deleted_at.is_(None)
        )
        total = self.session.exec(count_statement).one()

        return items, total

    def get_by_nombre(self, nombre: str) -> Optional[Categoria]:
        """Obtiene una categoría por nombre."""
        statement = select(Categoria).where(Categoria.nombre == nombre)
        return self.session.exec(statement).first()

    def get_by_id(self, categoria_id: int) -> Optional[Categoria]:
        """Get categoria by ID (returns None if soft-deleted)"""
        categoria = self.session.get(Categoria, categoria_id)
        if categoria and categoria.deleted_at is not None:
            return None
        return categoria

    def has_productos_activos(self, categoria_id: int) -> bool:
        """Verifica si la categoría tiene productos asociados"""
        from app.modules.productos.model import ProductoCategoriaLink
        result = self.session.exec(
            select(ProductoCategoriaLink).where(ProductoCategoriaLink.categoria_id == categoria_id)
        ).first()
        return result is not None

    def get_tree_cte(self) -> List[Categoria]:
        """Return all non-deleted categorias using a recursive CTE (WITH RECURSIVE).

        The CTE starts from root categories (parent_id IS NULL) and recursively
        fetches all descendants. Returns a flat list; callers assemble the tree.
        Works on both PostgreSQL and SQLite (WITH RECURSIVE since 3.8.3).
        """
        cat = Categoria.__table__

        # Anchor: roots (parent_id IS NULL, not soft-deleted)
        anchor = (
            select(cat)
            .where(cat.c.parent_id.is_(None))
            .where(cat.c.deleted_at.is_(None))
        )

        # CTE definition
        cte = anchor.cte(name="categoria_tree", recursive=True)

        # Recursive term: children of rows already in CTE
        recursive_term = (
            select(cat)
            .join(cte, cat.c.parent_id == cte.c.id)
            .where(cat.c.deleted_at.is_(None))
        )

        cte = cte.union_all(recursive_term)

        # Final SELECT from CTE
        statement = select(Categoria).join(cte, Categoria.id == cte.c.id)
        return list(self.session.exec(statement).all())

    def get_by_id_with_children(self, categoria_id: int) -> Optional[Tuple[Categoria, List[Categoria]]]:
        """Return a category and its direct (one-level) children.

        Returns None if the category does not exist or is soft-deleted.
        """
        categoria = self.get_by_id(categoria_id)
        if categoria is None:
            return None

        children_stmt = (
            select(Categoria)
            .where(Categoria.parent_id == categoria_id)
            .where(Categoria.deleted_at.is_(None))
        )
        children = list(self.session.exec(children_stmt).all())
        return categoria, children

    def delete(self, db_categoria: Categoria) -> None:
        """Soft delete a categoria"""
        db_categoria.deleted_at = datetime.now(timezone.utc)
        self.session.add(db_categoria)
