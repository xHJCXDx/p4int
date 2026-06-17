"""Tests para la validación de x-signature del webhook de MercadoPago."""

import hashlib
import hmac
from unittest.mock import patch

from app.core.mercadopago import verify_webhook_signature

SECRET = "test-webhook-secret-key"


def _build_signature(data_id: str, request_id: str, ts: str, secret: str) -> str:
    """Helper: genera un x-signature válido con el formato de MercadoPago."""
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    h = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={h}"


@patch("app.core.mercadopago.get_webhook_secret", return_value=SECRET)
def test_signature_valida(_mock):
    data_id = "12345"
    request_id = "req-abc-001"
    ts = "1718500000"
    x_signature = _build_signature(data_id, request_id, ts, SECRET)

    assert verify_webhook_signature(x_signature, request_id, data_id) is True


@patch("app.core.mercadopago.get_webhook_secret", return_value=SECRET)
def test_signature_invalida_hash_alterado(_mock):
    x_signature = "ts=1718500000,v1=aaaa_invalido_bbbb"
    assert verify_webhook_signature(x_signature, "req-001", "12345") is False


@patch("app.core.mercadopago.get_webhook_secret", return_value=SECRET)
def test_signature_invalida_data_id_distinto(_mock):
    data_id_real = "12345"
    data_id_falso = "99999"
    request_id = "req-001"
    ts = "1718500000"
    x_signature = _build_signature(data_id_real, request_id, ts, SECRET)

    assert verify_webhook_signature(x_signature, request_id, data_id_falso) is False


@patch("app.core.mercadopago.get_webhook_secret", return_value=SECRET)
def test_signature_sin_ts(_mock):
    assert verify_webhook_signature("v1=abcdef123456", "req-001", "12345") is False


@patch("app.core.mercadopago.get_webhook_secret", return_value=SECRET)
def test_signature_sin_v1(_mock):
    assert verify_webhook_signature("ts=1718500000", "req-001", "12345") is False


@patch("app.core.mercadopago.get_webhook_secret", return_value=SECRET)
def test_signature_vacia(_mock):
    assert verify_webhook_signature("", "req-001", "12345") is False


@patch("app.core.mercadopago.get_webhook_secret", return_value=None)
def test_sin_secret_configurado(_mock):
    """Si no hay MERCADOPAGO_WEBHOOK_SECRET, siempre retorna False."""
    x_signature = _build_signature("12345", "req-001", "1718500000", "any-secret")
    assert verify_webhook_signature(x_signature, "req-001", "12345") is False
