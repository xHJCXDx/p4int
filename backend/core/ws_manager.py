import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WSManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, canal: str) -> None:
        await websocket.accept()
        self._connections[canal].append(websocket)

    def disconnect(self, websocket: WebSocket, canal: str) -> None:
        connections = self._connections.get(canal, [])
        if websocket in connections:
            connections.remove(websocket)

    async def broadcast(self, canal: str, payload: dict[str, Any]) -> None:
        for websocket in list(self._connections.get(canal, [])):
            try:
                await websocket.send_json(payload)
            except Exception:
                self.disconnect(websocket, canal)

    async def broadcast_pedido(self, pedido_id: int, user_id: int | None, payload: dict[str, Any]) -> None:
        await self.broadcast(f"pedido:{pedido_id}", payload)
        if user_id is not None:
            await self.broadcast(f"user:{user_id}", payload)
        await self.broadcast("admin", payload)

    async def broadcast_to_role(self, role: str, payload: dict[str, Any]) -> None:
        await self.broadcast(role.strip().lower(), payload)

    def broadcast_pedido_sync(self, pedido_id: int, user_id: int | None, payload: dict[str, Any]) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(self.broadcast_pedido(pedido_id, user_id, payload))
        else:
            loop.create_task(self.broadcast_pedido(pedido_id, user_id, payload))


ws_manager = WSManager()
