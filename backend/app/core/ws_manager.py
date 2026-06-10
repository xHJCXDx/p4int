"""WebSocket connection manager para notificaciones en tiempo real."""

from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """Gestiona conexiones WebSocket agrupadas por usuario."""

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, message: dict):
        """Envía un mensaje JSON a todas las conexiones de un usuario."""
        if user_id not in self.active_connections:
            return
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def broadcast_to_roles(self, user_ids: List[int], message: dict):
        """Envía un mensaje a múltiples usuarios (ej: todos los de rol PEDIDOS)."""
        for user_id in user_ids:
            await self.send_to_user(user_id, message)


ws_manager = ConnectionManager()
