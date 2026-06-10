from typing import List, Optional
from sqlmodel import Session
from app.modules.pagos.model import Pago
from app.modules.pagos.schema import PagoCreate
from app.modules.pagos.unit_of_work import PagoUnitOfWork
from app.modules.usuarios.model import Usuario


def verify_pago_permission(current_user: Usuario) -> None:
    """Verifica que el usuario tenga rol ADMIN o PEDIDOS para gestionar pagos."""
    from app.modules.pedidos.service import is_admin_or_pedidos
    if not is_admin_or_pedidos(current_user):
        raise PermissionError("No tienes permiso para esta operación")


def verify_pago_read_permission(session: Session, pedido_id: int, current_user: Usuario) -> None:
    """Verifica que el usuario pueda ver los pagos de un pedido."""
    from app.modules.pedidos.service import get_pedido_by_id, is_client_only
    pedido = get_pedido_by_id(session, pedido_id)
    if not pedido:
        raise ValueError("Pedido no encontrado")
    if is_client_only(current_user) and pedido.usuario_id != current_user.id:
        raise PermissionError("No tienes permiso para ver los pagos de este pedido")


def get_pagos_by_pedido(session: Session, pedido_id: int) -> List[Pago]:
    """Obtiene todos los pagos de un pedido."""
    with PagoUnitOfWork(session) as uow:
        return uow.pagos.get_by_pedido(pedido_id)


def get_pago_by_id(session: Session, pago_id: int) -> Optional[Pago]:
    """Obtiene un pago por ID."""
    with PagoUnitOfWork(session) as uow:
        return uow.pagos.get_by_id(pago_id)


def create_pago(session: Session, pago_data: PagoCreate) -> Pago:
    """Crea un registro de pago."""
    with PagoUnitOfWork(session) as uow:
        pedido = uow.pedidos.get_by_id(pago_data.pedido_id)
        if not pedido:
            raise ValueError(f"Pedido {pago_data.pedido_id} no existe o ha sido eliminado")

        new_pago = Pago.model_validate(pago_data)
        uow.pagos.create(new_pago)
        uow.pagos.refresh(new_pago)
    return new_pago


def update_pago(session: Session, db_pago: Pago, pago_data: dict) -> Pago:
    """Actualiza un pago (para cambios de estado MP)."""
    with PagoUnitOfWork(session) as uow:
        update_dict = {k: v for k, v in pago_data.items() if v is not None}
        uow.pagos.update(db_pago, update_dict)
        uow.pagos.refresh(db_pago)
    return db_pago
