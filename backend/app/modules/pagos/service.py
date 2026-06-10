from typing import List, Optional
from uuid import uuid4
from sqlmodel import Session
from app.modules.pagos.model import Pago
from app.modules.pagos.schema import PagoCreate
from app.modules.pagos.unit_of_work import PagoUnitOfWork
from app.modules.usuarios.model import Usuario


def verify_pago_read_permission(session: Session, pedido_id: int, current_user: Usuario) -> None:
    from app.modules.pedidos.service import get_pedido_by_id, is_client_only
    pedido = get_pedido_by_id(session, pedido_id)
    if not pedido:
        raise ValueError("Pedido no encontrado")
    if is_client_only(current_user) and pedido.usuario_id != current_user.id:
        raise PermissionError("No tienes permiso para ver los pagos de este pedido")


def get_pagos_by_pedido(session: Session, pedido_id: int) -> List[Pago]:
    with PagoUnitOfWork(session) as uow:
        return uow.pagos.get_by_pedido(pedido_id)


def crear_pago(session: Session, pago_data: PagoCreate, current_user: Usuario) -> Pago:
    """Crea registro de pago para un pedido del cliente. Genera idempotency_key."""
    with PagoUnitOfWork(session) as uow:
        pedido = uow.pedidos.get_by_id(pago_data.pedido_id)
        if not pedido:
            raise ValueError(f"Pedido {pago_data.pedido_id} no existe")

        from app.modules.pedidos.service import is_client_only
        if is_client_only(current_user) and pedido.usuario_id != current_user.id:
            raise PermissionError("No podés crear pagos para pedidos ajenos")

        new_pago = Pago(
            pedido_id=pago_data.pedido_id,
            mp_status="pending",
            transaction_amount=pago_data.transaction_amount,
            external_reference=str(pedido.id),
            idempotency_key=str(uuid4()),
        )
        uow.pagos.create(new_pago)
        uow.pagos.refresh(new_pago)
    return new_pago


def process_webhook(session: Session, body: dict) -> dict:
    """
    Procesa notificación IPN de MercadoPago.
    Si approved → avanza pedido a CONFIRMADO.
    """
    topic = body.get("type") or body.get("topic")
    if topic != "payment":
        return {"status": "ignored"}

    data = body.get("data", {})
    payment_id = data.get("id")
    if not payment_id:
        raise ValueError("Webhook sin payment ID")

    # TODO: llamar sdk.payment().get(payment_id) para obtener estado real
    # Por ahora, stub que procesa el body directamente
    with PagoUnitOfWork(session) as uow:
        pagos = uow.pagos.get_all_by_mp_payment_id(payment_id)
        if not pagos:
            return {"status": "not_found"}

        pago = pagos[0]
        mp_status = body.get("action", "pending")

        uow.pagos.update(pago, {
            "mp_payment_id": payment_id,
            "mp_status": mp_status,
        })

        if mp_status == "payment.approved":
            from app.modules.pedidos.service import transition_estado
            transition_estado(session, pago.pedido_id, "CONFIRMADO", usuario_id=None)

    return {"status": "ok"}
