from fastapi import WebSocket, WebSocketDisconnect

from ..domain.accounts import User
from ..domain.chat import ChatMessage

MAX_CHAT_HISTORY = 100


class ChatHub:
    def __init__(self) -> None:
        self._connections: dict[WebSocket, str] = {}
        self._history: list[ChatMessage] = []

    async def connect(self, websocket: WebSocket, user: User, token: str) -> None:
        self._connections[websocket] = token
        await websocket.send_json({"type": "ready", "user": user.model_dump(by_alias=True)})
        await websocket.send_json({
            "type": "history",
            "messages": [message.model_dump(mode="json", by_alias=True) for message in self._history],
        })

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.pop(websocket, None)

    async def revoke_token(self, token: str) -> None:
        for connection, active_token in tuple(self._connections.items()):
            if active_token != token:
                continue
            self.disconnect(connection)
            try:
                await connection.close(code=4401, reason="Session revoked")
            except (WebSocketDisconnect, RuntimeError):
                pass

    async def publish(self, message: ChatMessage) -> None:
        self._history.append(message)
        del self._history[:-MAX_CHAT_HISTORY]
        payload = {"type": "message", "message": message.model_dump(mode="json", by_alias=True)}
        for connection in tuple(self._connections):
            try:
                await connection.send_json(payload)
            except (WebSocketDisconnect, RuntimeError):
                self.disconnect(connection)
