"""Configuracion del SDK de MercadoPago (Checkout Pro)."""

import hashlib
import hmac
import os
from typing import Optional

import mercadopago

_sdk = None


def get_mp_sdk() -> mercadopago.SDK:
    """Retorna instancia singleton del SDK de MercadoPago."""
    global _sdk
    if _sdk is None:
        access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
        if not access_token:
            raise RuntimeError("MERCADOPAGO_ACCESS_TOKEN no configurado")
        _sdk = mercadopago.SDK(access_token)
    return _sdk


def get_webhook_secret() -> Optional[str]:
    """Retorna el secret para validar x-signature de webhooks MP."""
    return os.getenv("MERCADOPAGO_WEBHOOK_SECRET")


def verify_webhook_signature(
    x_signature: str,
    x_request_id: str,
    data_id: str,
) -> bool:
    """Valida el header x-signature del webhook de MercadoPago.

    Formato x-signature: 'ts=<timestamp>,v1=<hash>'
    Template HMAC: 'id:<data.id>;request-id:<x-request-id>;ts:<ts>;'
    """
    secret = get_webhook_secret()
    if not secret:
        return False

    parts = {}
    for part in x_signature.split(","):
        key_val = part.strip().split("=", 1)
        if len(key_val) == 2:
            parts[key_val[0]] = key_val[1]

    ts = parts.get("ts")
    v1 = parts.get("v1")
    if not ts or not v1:
        return False

    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    computed = hmac.new(
        secret.encode(), manifest.encode(), hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed, v1)
