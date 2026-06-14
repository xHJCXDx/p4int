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
        return uow.unidades_medida.get_by_codigo(codigo)


def create_unidad_medida(session: Session, data) -> Optional[UnidadMedida]:
    """Crea una unidad de medida. Retorna None si ya existe."""
    with CatalogoUnitOfWork(session) as uow:
        existing = uow.unidades_medida.get_by_codigo(data.codigo)
        if existing:
            return None
        new_um = UnidadMedida(codigo=data.codigo, nombre=data.nombre, simbolo=data.simbolo, tipo=data.tipo)
        uow.unidades_medida.create(new_um)
    return new_um


def delete_unidad_medida(session: Session, codigo: str) -> Optional[str]:
    """Elimina una unidad de medida. Retorna mensaje de error si no se puede, None si ok."""
    with CatalogoUnitOfWork(session) as uow:
        um = uow.unidades_medida.get_by_codigo(codigo)
        if not um:
            return "Unidad de medida no encontrada"

        if uow.unidades_medida.is_in_use(um.id):
            return f"No se puede eliminar: hay ingredientes usando '{codigo}'"

        uow.unidades_medida.delete(um)
    return None


# --- FormaPago ---

def get_all_formas_pago(session: Session) -> List[FormaPago]:
    with CatalogoUnitOfWork(session) as uow:
        items, _ = uow.formas_pago.get_all()
        return items


def get_forma_pago(session: Session, codigo: str) -> Optional[FormaPago]:
    with CatalogoUnitOfWork(session) as uow:
        return uow.formas_pago.get_by_id(codigo)


# --- EstadoPedido ---

def get_all_estados_pedido(session: Session) -> List[EstadoPedido]:
    with CatalogoUnitOfWork(session) as uow:
        items, _ = uow.estados_pedido.get_all()
        return items


def get_estado_pedido(session: Session, codigo: str) -> Optional[EstadoPedido]:
    with CatalogoUnitOfWork(session) as uow:
        return uow.estados_pedido.get_by_id(codigo)
