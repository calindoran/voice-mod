from fastapi import WebSocket, WebSocketDisconnect

from ..domain.accounts import User
from ..domain.chat import ChatMessage


class ChatHub:
    def __init__(self) -> None:
        self._connections: dict[WebSocket, tuple[str, str, str]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        server_id: str,
        user: User,
        token: str,
        history: list[ChatMessage],
    ) -> None:
        self._connections[websocket] = (server_id, token, user.id)
        await websocket.send_json({"type": "ready", "user": user.model_dump(by_alias=True)})
        await websocket.send_json({
            "type": "history",
            "messages": [message.model_dump(mode="json", by_alias=True) for message in history],
        })

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.pop(websocket, None)

    async def revoke_token(self, token: str) -> None:
        for connection, (_, active_token, _) in tuple(self._connections.items()):
            if active_token == token:
                await self._close(connection, 4401, "Session revoked")

    async def revoke_membership(self, server_id: str, user_id: str) -> None:
        for connection, (active_server_id, _, active_user_id) in tuple(self._connections.items()):
            if active_server_id == server_id and active_user_id == user_id:
                await self._close(connection, 4403, "Server membership revoked")

    async def publish(self, server_id: str, message: ChatMessage) -> None:
        payload = {"type": "message", "message": message.model_dump(mode="json", by_alias=True)}
        for connection, (active_server_id, _, _) in tuple(self._connections.items()):
            if active_server_id != server_id:
                continue
            try:
                await connection.send_json(payload)
            except (WebSocketDisconnect, RuntimeError):
                self.disconnect(connection)

    async def _close(self, connection: WebSocket, code: int, reason: str) -> None:
        self.disconnect(connection)
        try:
            await connection.close(code=code, reason=reason)
        except (WebSocketDisconnect, RuntimeError):
            pass
