import asyncio
import secrets
import time
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from ...schemas.auth import WebSocketAuth
from ...domain.chat import ChatMessage
from ...schemas.chat import ChatMessageInput
from ...services.authentication import AuthenticationService
from ...infrastructure.chat_hub import ChatHub

router = APIRouter(tags=["Chat"])
AUTH_TIMEOUT_SECONDS = 10


@router.websocket("/ws/chat", name="chat_websocket")
async def chat_websocket(websocket: WebSocket) -> None:
    """Authenticated WebSocket chat. The first text frame must be {"token": "<bearer-token>"}."""
    await websocket.accept()
    chat_hub: ChatHub = websocket.app.state.chat_hub
    authentication: AuthenticationService = websocket.app.state.authentication_service

    try:
        try:
            auth_frame = await asyncio.wait_for(
                websocket.receive_text(), timeout=AUTH_TIMEOUT_SECONDS
            )
        except TimeoutError:
            await websocket.close(code=4408, reason="Authentication timed out")
            return
        except WebSocketDisconnect:
            return

        try:
            auth = WebSocketAuth.model_validate_json(auth_frame)
        except ValidationError:
            await websocket.close(code=4401, reason="Unauthorized")
            return

        session = authentication.get_session(auth.token)
        if session is None:
            await websocket.close(code=4401, reason="Unauthorized")
            return

        await chat_hub.connect(websocket, session.user, auth.token)
        while True:
            current_session = authentication.get_session(auth.token)
            if current_session is None:
                await websocket.close(code=4401, reason="Session expired")
                return
            timeout = max(current_session.expires_at - time.monotonic(), 0)
            try:
                raw_message = await asyncio.wait_for(
                    websocket.receive_text(), timeout=timeout
                )
            except TimeoutError:
                await websocket.close(code=4401, reason="Session expired")
                return

            try:
                message_input = ChatMessageInput.model_validate_json(raw_message)
            except ValidationError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Messages must contain 1 to 2000 non-whitespace characters.",
                })
                continue

            await chat_hub.publish(ChatMessage(
                id=secrets.token_urlsafe(12),
                sender_id=session.user.id,
                sender=session.user.user_name,
                text=message_input.text,
                created_at=datetime.now(timezone.utc),
            ))
    except WebSocketDisconnect:
        pass
    finally:
        chat_hub.disconnect(websocket)
