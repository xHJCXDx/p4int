from typing import List, Optional, Tuple
from datetime import datetime
from sqlmodel import Session
from app.modules.categorias.model import Categoria
from app.modules.categorias.schema import CategoriaCreate, CategoriaRead, CategoriaUpdate
from app.modules.categorias.unit_of_work import CategoriaUnitOfWork


def build_categoria_read(session: Session, categoria: Categoria) -> CategoriaRead:
    """Construye un CategoriaRead con el nombre del padre si tiene."""
    data = CategoriaRead.model_validate(categoria)
    if categoria.parent_id:
        with CategoriaUnitOfWork(session) as uow:
            parent = uow.categorias.get_by_id(categoria.parent_id)
            if parent:
                data.parent_nombre = parent.nombre
    return data


def get_all(session: Session, limit: int = 100, offset: int = 0, parent_id: Optional[int] = None) -> Tuple[List[Categoria], int]:
    with CategoriaUnitOfWork(session) as uow:
        if parent_id is not None:
            return uow.categorias.get_all_by_parent(parent_id, limit, offset)
        return uow.categorias.get_all(limit, offset)


def get_by_id(session: Session, categoria_id: int) -> Optional[Categoria]:
    with CategoriaUnitOfWork(session) as uow:
        return uow.categorias.get_by_id(categoria_id)


def create(session: Session, categoria_data: CategoriaCreate) -> Categoria:
    with CategoriaUnitOfWork(session) as uow:
        db_categoria = Categoria.model_validate(categoria_data)
        uow.categorias.create(db_categoria)
        uow.categorias.refresh(db_categoria)
    return db_categoria


def update(session: Session, db_categoria: Categoria, categoria_data: CategoriaUpdate) -> Categoria:
    with CategoriaUnitOfWork(session) as uow:
        categoria_dict = categoria_data.model_dump(exclude_unset=True)
        categoria_dict["updated_at"] = datetime.utcnow()
        uow.categorias.update(db_categoria, categoria_dict)
        uow.categorias.refresh(db_categoria)
    return db_categoria


def delete(session: Session, db_categoria: Categoria) -> Optional[str]:
    """Soft delete. Retorna mensaje de error si no se puede eliminar, None si ok."""
    with CategoriaUnitOfWork(session) as uow:
        if uow.categorias.has_productos_activos(db_categoria.id):
            return "No se puede eliminar la categoría porque tiene productos asociados"
        uow.categorias.delete(db_categoria)
    return None
