"""WebSocket connection manager para notificaciones en tiempo real."""

from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """Gestiona conexiones WebSocket agrupadas por canal (pedido:{id} o admin)."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel] = [
                ws for ws in self.active_connections[channel] if ws != websocket
            ]
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    async def _send_to_channel(self, channel: str, data: dict):
        """Envía un mensaje a todas las conexiones de un canal, removiendo las muertas."""
        if channel not in self.active_connections:
            return
        dead: List[WebSocket] = []
        for ws in self.active_connections[channel]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, channel)

    async def broadcast_pedido(self, pedido_id: int, data: dict):
        """Notifica a suscriptores del pedido específico Y a todos los admins."""
        await self._send_to_channel(f"pedido:{pedido_id}", data)
        await self._send_to_channel("admin", data)

    async def broadcast_to_role(self, role: str, data: dict):
        """Notifica a todas las conexiones del canal que coincide con el rol."""
        await self._send_to_channel(role, data)


ws_manager = ConnectionManager()
