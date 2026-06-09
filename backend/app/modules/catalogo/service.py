from typing import List, Optional
from sqlmodel import Session
from app.modules.catalogo.model import FormaPago, EstadoPedido, UnidadMedida
from app.modules.catalogo.unit_of_work import CatalogoUnitOfWork


def get_all_unidades_medida(session: Session) -> List[UnidadMedida]:
    """Obtiene todas las unidades de medida."""
    with CatalogoUnitOfWork(session) as uow:
        return uow.unidades_medida.get_all_simple()


def get_unidad_medida(session: Session, codigo: str) -> Optional[UnidadMedida]:
    """Obtiene una unidad de medida por código."""
    with CatalogoUnitOfWork(session) as uow:
        return uow.unidades_medida.get_by_id(codigo)


def create_unidad_medida(session: Session, codigo: str, nombre: str) -> Optional[UnidadMedida]:
    """Crea una unidad de medida. Retorna None si ya existe."""
    with CatalogoUnitOfWork(session) as uow:
        existing = uow.unidades_medida.get_by_id(codigo)
        if existing:
            return None
        new_um = UnidadMedida(codigo=codigo, nombre=nombre)
        uow.unidades_medida.create(new_um)
    return new_um


def delete_unidad_medida(session: Session, codigo: str) -> Optional[str]:
    """Elimina una unidad de medida. Retorna mensaje de error si no se puede, None si ok."""
    with CatalogoUnitOfWork(session) as uow:
        um = uow.unidades_medida.get_by_id(codigo)
        if not um:
            return "Unidad de medida no encontrada"

        if uow.unidades_medida.is_in_use(codigo):
            return f"No se puede eliminar: hay ingredientes usando '{codigo}'"

        uow.unidades_medida.delete(um)
    return None
