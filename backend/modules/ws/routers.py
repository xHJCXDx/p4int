from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.core.ws_manager import ws_manager
from backend.modules.auth.security import decode_access_token

router = APIRouter(prefix="/ws", tags=["websocket"])


async def _authenticate_ws(websocket: WebSocket, token: str | None) -> dict | None:
    token_value = token or websocket.cookies.get("access_token")
    if not token_value:
        await websocket.close(code=1008)
        return None

    try:
        return decode_access_token(token_value)
    except Exception:
        await websocket.close(code=1008)
        return None


async def _connect_to_channel(websocket: WebSocket, canal: str) -> None:
    await ws_manager.connect(websocket, canal)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, canal)


@router.websocket("/pedidos")
async def ws_pedidos(
    websocket: WebSocket,
    token: str | None = Query(default=None),
    pedido_id: int | None = Query(default=None),
):
    payload = await _authenticate_ws(websocket, token)
    if payload is None:
        return
    rol = payload.get("rol")
    user_id = payload.get("sub")
    canal = "admin" if rol in {"ADMIN", "PEDIDOS"} else f"pedido:{pedido_id}" if pedido_id else f"user:{user_id}"
    await _connect_to_channel(websocket, canal)


@router.websocket("/admin/pedidos")
async def ws_admin_pedidos(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    payload = await _authenticate_ws(websocket, token)
    if payload is None:
        return
    if payload.get("rol") not in {"ADMIN", "PEDIDOS"}:
        await websocket.close(code=1008)
        return
    await _connect_to_channel(websocket, "admin")


@router.websocket("/pedidos/{pedido_id}")
async def ws_pedido_detalle(
    pedido_id: int,
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    payload = await _authenticate_ws(websocket, token)
    if payload is None:
        return
    if payload.get("rol") in {"ADMIN", "PEDIDOS"}:
        canal = "admin"
    else:
        canal = f"pedido:{pedido_id}"
    await _connect_to_channel(websocket, canal)
