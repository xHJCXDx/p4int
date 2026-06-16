import os
import logging
from typing import List, Optional
from uuid import uuid4
from sqlmodel import Session
from app.modules.pagos.model import Pago
from app.modules.pagos.schema import PagoCreate
from app.modules.pagos.unit_of_work import PagoUnitOfWork
from app.modules.usuarios.model import Usuario
from app.modules.pedidos.service import is_client_only, get_pedido_by_id

logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def verify_pago_read_permission(session: Session, pedido_id: int, current_user: Usuario) -> None:
    pedido = get_pedido_by_id(session, pedido_id)
    if not pedido:
        raise ValueError("Pedido no encontrado")
    if is_client_only(current_user) and pedido.usuario_id != current_user.id:
        raise PermissionError("No tienes permiso para ver los pagos de este pedido")


def get_pagos_by_pedido(session: Session, pedido_id: int) -> List[Pago]:
    with PagoUnitOfWork(session) as uow:
        return uow.pagos.get_by_pedido(pedido_id)


def _create_mp_preference(pedido, detalles, idempotency_key: str) -> Optional[dict]:
    """Crea una preference de Checkout Pro en MercadoPago.
    Retorna el response de MP o None si el SDK no esta configurado.
    """
    try:
        from app.core.mercadopago import get_mp_sdk
        sdk = get_mp_sdk()
    except RuntimeError:
        logger.warning("MP SDK no configurado, creando pago sin preference")
        return None

    items = []
    for det in detalles:
        items.append({
            "title": det.nombre_snapshot,
            "quantity": det.cantidad,
            "unit_price": float(det.precio_snapshot),
            "currency_id": "ARS",
        })

    preference_data = {
        "items": items,
        "external_reference": str(pedido.id),
        "back_urls": {
            "success": f"{FRONTEND_URL}/store/mis-pedidos?pago=ok",
            "failure": f"{FRONTEND_URL}/store/mis-pedidos?pago=error",
            "pending": f"{FRONTEND_URL}/store/mis-pedidos?pago=pendiente",
        },
        # auto_return requiere back_urls HTTPS — omitir en desarrollo local
        "notification_url": os.getenv(
            "MERCADOPAGO_WEBHOOK_URL",
            "https://example.com/api/v1/pagos/webhook",
        ),
    }

    from mercadopago.config import RequestOptions
    request_options = RequestOptions(custom_headers={"x-idempotency-key": idempotency_key})
    result = sdk.preference().create(preference_data, request_options)
    if result["status"] == 201:
        return result["response"]

    logger.error("Error creando preference MP: %s", result)
    return None


def crear_pago(session: Session, pago_data: PagoCreate, current_user: Usuario) -> dict:
    """Crea registro de pago y preference de MercadoPago (Checkout Pro).
    Si ya existe un pago pendiente para el pedido, regenera la preference de MP.
    """
    with PagoUnitOfWork(session) as uow:
        pedido = uow.pedidos.get_by_id(pago_data.pedido_id)
        if not pedido:
            raise ValueError(f"Pedido {pago_data.pedido_id} no existe")

        if is_client_only(current_user) and pedido.usuario_id != current_user.id:
            raise PermissionError("No podes crear pagos para pedidos ajenos")

        # Obtener detalles del pedido para armar items de la preference
        detalles = uow.detalles.get_by_pedido(pedido.id)

        # Reutilizar pago existente si ya hay uno pendiente
        existing_pagos = uow.pagos.get_by_pedido(pedido.id)
        existing_pago = next((p for p in existing_pagos if p.mp_status == "pending"), None)

        idempotency_key = str(uuid4())
        mp_response = _create_mp_preference(pedido, detalles, idempotency_key)

        if existing_pago:
            uow.pagos.update(existing_pago, {"idempotency_key": idempotency_key})
            pago = existing_pago
        else:
            pago = Pago(
                pedido_id=pago_data.pedido_id,
                mp_status="pending",
                transaction_amount=pago_data.transaction_amount,
                external_reference=str(pedido.id),
                idempotency_key=idempotency_key,
            )
            uow.pagos.create(pago)
        uow.pagos.refresh(pago)

    # Retornar pago + init_point como dict para el router
    pago_dict = {
        "id": pago.id,
        "pedido_id": pago.pedido_id,
        "mp_payment_id": pago.mp_payment_id,
        "mp_status": pago.mp_status,
        "mp_status_detail": pago.mp_status_detail,
        "transaction_amount": pago.transaction_amount,
        "external_reference": pago.external_reference,
        "idempotency_key": pago.idempotency_key,
        "payment_method_id": pago.payment_method_id,
        "init_point": mp_response.get("init_point") if mp_response else None,
        "created_at": pago.created_at,
        "updated_at": pago.updated_at,
    }
    return pago_dict


def process_webhook(session: Session, body: dict) -> dict:
    """Procesa notificacion IPN de MercadoPago.
    Consulta el estado real del pago via SDK y actualiza.
    Si approved -> avanza pedido a CONFIRMADO (FUERA del UoW de pagos).
    """
    topic = body.get("type") or body.get("topic")
    if topic != "payment":
        return {"status": "ignored"}

    data = body.get("data", {})
    payment_id = data.get("id")
    if not payment_id:
        raise ValueError("Webhook sin payment ID")

    # Consultar estado real del pago via SDK
    mp_payment = None
    try:
        from app.core.mercadopago import get_mp_sdk
        sdk = get_mp_sdk()
        result = sdk.payment().get(payment_id)
        if result["status"] == 200:
            mp_payment = result["response"]
    except RuntimeError:
        logger.warning("MP SDK no configurado, procesando webhook sin verificacion")

    pedido_id_to_confirm = None

    with PagoUnitOfWork(session) as uow:
        # Buscar pago por external_reference (pedido_id)
        if mp_payment:
            ext_ref = str(mp_payment.get("external_reference", ""))
            pago = uow.pagos.get_by_external_reference(ext_ref)
            mp_status = mp_payment.get("status", "unknown")
            mp_status_detail = mp_payment.get("status_detail")
            mp_method = mp_payment.get("payment_method_id")
        else:
            # Fallback: buscar por mp_payment_id
            pagos = uow.pagos.get_all_by_mp_payment_id(payment_id)
            if not pagos:
                return {"status": "not_found"}
            pago = pagos[0]
            mp_status = body.get("action", "pending")
            mp_status_detail = None
            mp_method = None

        if not pago:
            return {"status": "not_found"}

        update_data = {
            "mp_payment_id": payment_id,
            "mp_status": mp_status,
        }
        if mp_status_detail:
            update_data["mp_status_detail"] = mp_status_detail
        if mp_method:
            update_data["payment_method_id"] = mp_method

        uow.pagos.update(pago, update_data)

        if mp_status == "approved":
            pedido_id_to_confirm = pago.pedido_id

    # Transición de estado FUERA del UoW de pagos (commit separado, WS post-commit)
    if pedido_id_to_confirm is not None:
        from app.modules.pedidos.service import transition_estado
        try:
            transition_estado(session, pedido_id_to_confirm, "CONFIRMADO", usuario_id=None)
        except ValueError:
            logger.info("Pedido %s ya fue transicionado", pedido_id_to_confirm)

    return {"status": "ok"}
