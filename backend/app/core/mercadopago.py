"""Configuracion del SDK de MercadoPago (Checkout Pro)."""

import os
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
