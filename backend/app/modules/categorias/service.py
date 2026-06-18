from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlmodel import Session
from app.modules.categorias.model import Categoria
from app.modules.categorias.schema import CategoriaCreate, CategoriaRead, CategoriaUpdate, CategoriaWithChildren
from app.modules.categorias.unit_of_work import CategoriaUnitOfWork


def build_categoria_read(session_or_uow, categoria: Categoria) -> CategoriaRead:
    """Construye un CategoriaRead con el nombre del padre si tiene.

    Acepta Session (abre UoW internamente) o CategoriaUnitOfWork.
    """
    data = CategoriaRead.model_validate(categoria)
    if categoria.parent_id:
        if isinstance(session_or_uow, CategoriaUnitOfWork):
            parent = session_or_uow.categorias.get_by_id(categoria.parent_id)
        else:
            with CategoriaUnitOfWork(session_or_uow) as uow:
                parent = uow.categorias.get_by_id(categoria.parent_id)
        if parent:
            data.parent_nombre = parent.nombre
    return data


def get_tree(session: Session) -> List[dict]:
    """Return the full category hierarchy as a nested tree using recursive CTE."""
    with CategoriaUnitOfWork(session) as uow:
        flat = uow.categorias.get_tree_cte()

    # Build nested tree from flat list
    by_id = {c.id: {**CategoriaRead.model_validate(c).model_dump(), "children": []} for c in flat}
    roots = []
    for c in flat:
        node = by_id[c.id]
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id]["children"].append(node)
        else:
            roots.append(node)
    return roots


def get_all_as_read(session: Session, limit: int = 100, offset: int = 0, parent_id: Optional[int] = None) -> Tuple[List[CategoriaRead], int]:
    """Obtiene categorías paginadas ya serializadas como CategoriaRead."""
    with CategoriaUnitOfWork(session) as uow:
        if parent_id is not None:
            categorias, total = uow.categorias.get_all_by_parent(parent_id, offset, limit)
        else:
            categorias, total = uow.categorias.list_all(offset, limit)
        result = [build_categoria_read(uow, c) for c in categorias]
    return result, total


def get_all(session: Session, limit: int = 100, offset: int = 0, parent_id: Optional[int] = None) -> Tuple[List[Categoria], int]:
    with CategoriaUnitOfWork(session) as uow:
        if parent_id is not None:
            return uow.categorias.get_all_by_parent(parent_id, offset, limit)
        return uow.categorias.list_all(offset, limit)


def get_by_id(session: Session, categoria_id: int) -> Optional[Categoria]:
    with CategoriaUnitOfWork(session) as uow:
        return uow.categorias.get_by_id(categoria_id)


def get_categoria_by_id(session: Session, categoria_id: int) -> Optional[CategoriaWithChildren]:
    """Return a categoria with its direct children, or None if not found / soft-deleted."""
    with CategoriaUnitOfWork(session) as uow:
        result = uow.categorias.get_by_id_with_children(categoria_id)

    if result is None:
        return None

    categoria, children = result
    return CategoriaWithChildren(
        id=categoria.id,
        nombre=categoria.nombre,
        descripcion=categoria.descripcion,
        imagen_url=categoria.imagen_url,
        parent_id=categoria.parent_id,
        created_at=categoria.created_at,
        updated_at=categoria.updated_at,
        children=[CategoriaRead.model_validate(c) for c in children],
    )


def create(session: Session, categoria_data: CategoriaCreate) -> Categoria:
    with CategoriaUnitOfWork(session) as uow:
        db_categoria = Categoria.model_validate(categoria_data)
        uow.categorias.create(db_categoria)
        uow.categorias.refresh(db_categoria)
    return db_categoria


def update(session: Session, db_categoria: Categoria, categoria_data: CategoriaUpdate) -> Categoria:
    with CategoriaUnitOfWork(session) as uow:
        categoria_dict = categoria_data.model_dump(exclude_unset=True)
        categoria_dict["updated_at"] = datetime.now(timezone.utc)
        uow.categorias.update(db_categoria, categoria_dict)
        uow.categorias.refresh(db_categoria)
    return db_categoria


def delete(session: Session, db_categoria: Categoria) -> Optional[str]:
    """Soft delete. Retorna mensaje de error si no se puede eliminar, None si ok."""
    with CategoriaUnitOfWork(session) as uow:
        if uow.categorias.has_productos_activos(db_categoria.id):
            return "No se puede eliminar la categoría porque tiene productos asociados"
        uow.categorias.soft_delete(db_categoria)
    return None
