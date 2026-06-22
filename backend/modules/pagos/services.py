import os
import uuid
from datetime import datetime
from decimal import Decimal

import mercadopago
from fastapi import HTTPException, status
from sqlmodel import Session

from backend.core.unit_of_work import UnitOfWork
from backend.core.ws_manager import ws_manager
from backend.modules.pagos.models import Pago
from backend.modules.pedidos.models import Pedido


class PagoService:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._sdk = mercadopago.SDK(os.getenv("MP_ACCESS_TOKEN", ""))

    def _get_pedido_or_404(self, uow: UnitOfWork, pedido_id: int) -> Pedido:
        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pedido con id={pedido_id} no encontrado",
            )
        return pedido

    def crear_preferencia_mp(self, pedido_id: int, usuario_id: int) -> dict:
        with UnitOfWork(self._session) as uow:
            pedido = self._get_pedido_or_404(uow, pedido_id)

            if pedido.usuario_id != usuario_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tenes acceso a este pedido",
                )
            if pedido.estado_codigo != "PENDIENTE":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El pedido no esta en estado PENDIENTE (estado actual: {pedido.estado_codigo})",
                )
            if pedido.forma_pago_codigo != "MERCADOPAGO":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este pedido no tiene MercadoPago como forma de pago",
                )

            pedido_total = pedido.total
            external_reference = str(pedido.id)
            idempotency_key = str(uuid.uuid4())

        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        preference_data = {
            "items": [
                {
                    "id": str(pedido_id),
                    "title": f"Pedido #{pedido_id} - Tienda",
                    "quantity": 1,
                    "unit_price": float(pedido_total),
                    "currency_id": "ARS",
                }
            ],
            "back_urls": {
                "success": f"{backend_url}/api/v1/pagos/redirect/{pedido_id}/success",
                "failure": f"{backend_url}/api/v1/pagos/redirect/{pedido_id}/failure",
                "pending": f"{backend_url}/api/v1/pagos/redirect/{pedido_id}/pending",
            },
            "auto_return": "approved",
            "external_reference": external_reference,
            "notification_url": f"{backend_url}/api/v1/pagos/webhook",
            "metadata": {"idempotency_key": idempotency_key},
        }

        response = self._sdk.preference().create(preference_data)
        if response["status"] != 201:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"MP respondio {response['status']}: {response.get('response')}",
            )

        with UnitOfWork(self._session) as uow:
            pago = uow.pagos.get_by_pedido_id(pedido_id)
            if not pago:
                pago = Pago(
                    pedido_id=pedido_id,
                    mp_status="pending",
                    transaction_amount=pedido_total,
                    external_reference=external_reference,
                    idempotency_key=idempotency_key,
                )
            else:
                pago.mp_status = "pending"
                pago.transaction_amount = pedido_total
                pago.external_reference = external_reference
                pago.idempotency_key = idempotency_key
                pago.updated_at = datetime.utcnow()
            uow.pagos.add(pago)

        return {
            "pedido_id": pedido_id,
            "init_point": response["response"]["init_point"],
        }

    def _persist_mp_payment(self, payment: dict, fallback_pedido_id: int | None = None) -> tuple[int | None, str]:
        mp_status = payment.get("status") or "pending"
        external_reference = payment.get("external_reference") or (str(fallback_pedido_id) if fallback_pedido_id else None)
        if not external_reference:
            return None, mp_status

        try:
            pedido_id = int(external_reference)
        except ValueError:
            if fallback_pedido_id is None:
                return None, mp_status
            pedido_id = fallback_pedido_id

        with UnitOfWork(self._session) as uow:
            pedido = uow.pedidos.get_by_id(pedido_id)
            if not pedido:
                return None, mp_status

            mp_payment_id = payment.get("id")
            pago = None
            if mp_payment_id is not None:
                pago = uow.pagos.get_by_mp_payment_id(int(mp_payment_id))
            if not pago:
                pago = uow.pagos.get_by_external_reference(external_reference)
            if not pago:
                pago = uow.pagos.get_by_pedido_id(pedido_id)
            if not pago:
                pago = Pago(
                    pedido_id=pedido_id,
                    external_reference=external_reference,
                    idempotency_key=str(uuid.uuid4()),
                )

            pago.mp_payment_id = int(mp_payment_id) if mp_payment_id is not None else None
            pago.mp_status = mp_status
            pago.mp_status_detail = payment.get("status_detail")
            pago.transaction_amount = Decimal(str(payment.get("transaction_amount") or pedido.total))
            pago.payment_method_id = payment.get("payment_method_id")
            pago.updated_at = datetime.utcnow()
            uow.pagos.add(pago)

            return pedido_id, mp_status

    def _broadcast_pago_confirmado(self, pedido_id: int) -> None:
        with UnitOfWork(self._session) as uow:
            pedido = self._get_pedido_or_404(uow, pedido_id)
            usuario_id = pedido.usuario_id

        ws_manager.broadcast_pedido_sync(
            pedido_id,
            usuario_id,
            {
                "event": "pago_confirmado",
                "pedido_id": pedido_id,
                "mp_status": "approved",
            },
        )

    def confirmar_pago_mp(self, payment_id: str) -> None:
        response = self._sdk.payment().get(payment_id)
        if response["status"] != 200:
            return

        pedido_id, mp_status = self._persist_mp_payment(response["response"])
        if pedido_id and mp_status == "approved":
            self._broadcast_pago_confirmado(pedido_id)

    _STATUS_MAP = {
        "approved": "aprobado",
        "rejected": "rechazado",
        "cancelled": "rechazado",
        "refunded": "rechazado",
        "charged_back": "rechazado",
        "pending": "pendiente",
        "in_process": "pendiente",
        "authorized": "pendiente",
    }

    def _confirmar_desde_retorno_mp(self, pedido_id: int, payment_id: int, mp_status: str) -> dict:
        estado_local = self._STATUS_MAP.get(mp_status, "pendiente")
        with UnitOfWork(self._session) as uow:
            pedido = self._get_pedido_or_404(uow, pedido_id)
            pedido_total = pedido.total
            pago = uow.pagos.get_by_pedido_id(pedido_id)
            if not pago:
                pago = Pago(
                    pedido_id=pedido_id,
                    external_reference=str(pedido_id),
                    idempotency_key=str(uuid.uuid4()),
                    transaction_amount=pedido_total,
                )
            pago.mp_payment_id = payment_id
            pago.mp_status = mp_status
            pago.transaction_amount = Decimal(str(pedido_total))
            pago.updated_at = datetime.utcnow()
            uow.pagos.add(pago)

        if estado_local == "aprobado":
            self._broadcast_pago_confirmado(pedido_id)

        return {"estado": estado_local, "pedido_id": pedido_id}

    def confirmar_pago(self, pedido_id: int, payment_id: int, mp_status: str | None = None) -> dict:
        response = self._sdk.payment().get(payment_id)
        if response["status"] != 200:
            if mp_status in self._STATUS_MAP:
                return self._confirmar_desde_retorno_mp(pedido_id, payment_id, mp_status)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo consultar el pago en MercadoPago",
            )

        payment = response["response"]
        persisted_pedido_id, mp_status = self._persist_mp_payment(payment, fallback_pedido_id=pedido_id)
        estado_local = self._STATUS_MAP.get(mp_status, "pendiente")

        if persisted_pedido_id and estado_local == "aprobado":
            self._broadcast_pago_confirmado(persisted_pedido_id)

        return {"estado": estado_local, "pedido_id": pedido_id}
