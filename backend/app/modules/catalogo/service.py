from typing import List
from sqlmodel import Session
from app.modules.catalogo.model import FormaPago, EstadoPedido, UnidadMedida
from app.modules.catalogo.unit_of_work import CatalogoUnitOfWork
from app.core.response import BusinessRuleError


def get_all_unidades_medida(session: Session) -> List[UnidadMedida]:
    """Obtiene todas las unidades de medida."""
    with CatalogoUnitOfWork(session) as uow:
        return uow.unidades_medida.get_all_simple()


def create_unidad_medida(session: Session, data) -> UnidadMedida:
    """Crea una unidad de medida. Lanza BusinessRuleError si ya existe."""
    with CatalogoUnitOfWork(session) as uow:
        existing = uow.unidades_medida.get_by_codigo(data.codigo)
        if existing:
            raise BusinessRuleError(
                detail=f"La unidad '{data.codigo}' ya existe",
                code="DUPLICATE_CODIGO",
                status_code=400,
                field="codigo",
            )
        new_um = UnidadMedida(codigo=data.codigo, nombre=data.nombre, simbolo=data.simbolo, tipo=data.tipo)
        uow.unidades_medida.create(new_um)
    return new_um


def delete_unidad_medida(session: Session, codigo: str) -> None:
    """Elimina una unidad de medida. Lanza BusinessRuleError si no se puede."""
    with CatalogoUnitOfWork(session) as uow:
        um = uow.unidades_medida.get_by_codigo(codigo)
        if not um:
            raise BusinessRuleError(detail="Unidad de medida no encontrada", code="NOT_FOUND", status_code=404)

        if uow.unidades_medida.is_in_use(um.id):
            raise BusinessRuleError(
                detail=f"No se puede eliminar: hay ingredientes usando '{codigo}'",
                code="IN_USE",
                status_code=400,
            )

        uow.unidades_medida.hard_delete(um)


# --- FormaPago ---

def get_all_formas_pago(session: Session) -> List[FormaPago]:
    with CatalogoUnitOfWork(session) as uow:
        items, _ = uow.formas_pago.list_all()
        return items



# --- EstadoPedido ---

def get_all_estados_pedido(session: Session) -> List[EstadoPedido]:
    with CatalogoUnitOfWork(session) as uow:
        items, _ = uow.estados_pedido.list_all()
        return items


