from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, Set

from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info("WebSocket connected. Total: %d", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info("WebSocket disconnected. Total: %d", len(self.active_connections))

    async def broadcast(self, message: dict) -> None:
        data = json.dumps(message, default=str)
        async with self._lock:
            targets = list(self.active_connections)
        if not targets:
            return
        for ws in targets:
            try:
                await ws.send_text(data)
            except Exception as exc:
                logger.warning("WebSocket send failed: %s", exc)
                try:
                    await ws.close()
                except Exception:
                    pass
                await self.disconnect(ws)


manager = ConnectionManager()