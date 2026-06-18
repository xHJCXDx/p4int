import logging
from fastapi import APIRouter, Depends, Request, status
from sqlmodel import Session
from app.core.database import get_session
from app.core.response import success_response, error_response, ApiResponse
from app.core.security import get_current_user
from app.core.mercadopago import verify_webhook_signature, get_webhook_secret
from app.modules.pagos.schema import PagoCreate, PagoRead, PagoCreateResponse
from app.modules.pagos import service
from app.modules.usuarios.model import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pagos", tags=["Pagos"])


@router.post("/crear", status_code=status.HTTP_201_CREATED)
def crear_pago(
    pago: PagoCreate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Crea pago y preference de MercadoPago (Checkout Pro)."""
    try:
        pago_dict = service.crear_pago(session, pago, current_user)
        return success_response(
            data=PagoCreateResponse.model_validate(pago_dict),
            message="Pago creado exitosamente",
            status_code=201,
        )
    except PermissionError as e:
        return error_response(detail=str(e), status_code=403, code="FORBIDDEN")
    except ValueError as e:
        return error_response(detail=str(e), status_code=400, code="VALIDATION_ERROR")


@router.post("/webhook")
async def webhook_mercadopago(request: Request, session: Session = Depends(get_session)):
    """Endpoint IPN de MercadoPago. Valida x-signature, actualiza estado del pago y del pedido."""
    x_signature = request.headers.get("x-signature", "")
    x_request_id = request.headers.get("x-request-id", "")
    data_id = request.query_params.get("data.id", "")

    if get_webhook_secret():
        if not x_signature or not verify_webhook_signature(x_signature, x_request_id, data_id):
            logger.warning("Webhook rechazado: x-signature inválida")
            return error_response(detail="Firma inválida", status_code=401, code="INVALID_SIGNATURE")
    else:
        logger.warning("MERCADOPAGO_WEBHOOK_SECRET no configurado, omitiendo validación de firma")

    try:
        body = await request.json()
        result = service.process_webhook(session, body)
        if result and result.get("transition_needed"):
            from app.modules.pedidos.service import transition_estado
            pedido_id = result["pedido_id"]
            new_status = result["new_status"]
            try:
                transition_estado(session, pedido_id, new_status, usuario_id=None)
            except ValueError:
                logger.info("Pedido %s ya fue transicionado a %s", pedido_id, new_status)
        return {"status": "ok"}
    except ValueError as e:
        return error_response(detail=str(e), status_code=400, code="WEBHOOK_ERROR")


@router.get("/{pedido_id}")
def read_pago_pedido(
    pedido_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
) -> ApiResponse:
    """Consulta el pago asociado a un pedido."""
    try:
        service.verify_pago_read_permission(session, pedido_id, current_user)
        pagos = service.get_pagos_by_pedido(session, pedido_id)
        if not pagos:
            return error_response(detail="No hay pagos para este pedido", status_code=404, code="NOT_FOUND")
        return success_response(
            data=PagoRead.model_validate(pagos[0]),
            message="Pago obtenido",
        )
    except PermissionError as e:
        return error_response(detail=str(e), status_code=403, code="FORBIDDEN")
    except ValueError as e:
        return error_response(detail=str(e), status_code=404, code="NOT_FOUND")
