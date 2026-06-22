from sqlmodel import SQLModel

class PreferenciaResponse(SQLModel):
    pedido_id: int
    init_point: str

class WebhookMPData(SQLModel):
    id: str

class WebhookMPBody(SQLModel):
    type: str
    data: WebhookMPData


class ConfirmarPagoRequest(SQLModel):
    pedido_id: int
    payment_id: int
    mp_status: str | None = None


class ConfirmarPagoResponse(SQLModel):
    estado: str
    pedido_id: int
