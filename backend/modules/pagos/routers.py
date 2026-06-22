import os

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlmodel import Session

from backend.core.database import get_session
from backend.modules.auth.dependencies import get_current_user
from backend.modules.auth.models import Usuario
from backend.modules.pagos.schemas import (
    ConfirmarPagoRequest,
    ConfirmarPagoResponse,
    PreferenciaResponse,
    WebhookMPBody,
)
from backend.modules.pagos.services import PagoService

router = APIRouter(prefix="/pagos", tags=["pagos"])

_STATUS_TO_PATH = {
    "success": "exito",
    "failure": "fallo",
    "pending": "pendiente",
}


def get_service(session: Session = Depends(get_session)) -> PagoService:
    return PagoService(session)


@router.post("/preferencia/{pedido_id}", response_model=PreferenciaResponse)
def crear_preferencia(
    pedido_id: int,
    svc: PagoService = Depends(get_service),
    current_user: Usuario = Depends(get_current_user),
):
    result = svc.crear_preferencia_mp(pedido_id, current_user.id)
    return PreferenciaResponse(**result)


@router.get("/redirect/{pedido_id}/{status}")
def redirect_pago(pedido_id: int, status: str, request: Request):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    path = _STATUS_TO_PATH.get(status, status)
    query = f"?{request.url.query}" if request.url.query else ""
    return RedirectResponse(url=f"{frontend_url}/pago/{path}{query}")


@router.post("/confirm", response_model=ConfirmarPagoResponse)
def confirmar_pago(
    data: ConfirmarPagoRequest,
    svc: PagoService = Depends(get_service),
):
    result = svc.confirmar_pago(data.pedido_id, data.payment_id, data.mp_status)
    return ConfirmarPagoResponse(**result)


@router.post("/webhook")
def webhook_mp(
    body: WebhookMPBody,
    svc: PagoService = Depends(get_service),
):
    if body.type == "payment":
        svc.confirmar_pago_mp(body.data.id)
    return {"status": "ok"}
