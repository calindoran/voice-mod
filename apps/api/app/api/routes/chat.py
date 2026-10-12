import asyncio
import secrets
import time
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from ...domain.chat import ChatMessage
from ...infrastructure.chat_hub import ChatHub
from ...schemas.auth import WebSocketAuth
from ...schemas.chat import ChatMessageInput
from ...services.authentication import AuthenticationService
from ...services.communities import CommunityService

router = APIRouter(tags=["Community chat"])
AUTH_TIMEOUT_SECONDS = 10


@router.websocket("/ws/servers/{server_id}/chat", name="server_chat_websocket")
async def server_chat_websocket(websocket: WebSocket, server_id: str) -> None:
    """Authenticated, membership-scoped text chat for a community server."""
    await websocket.accept()
    chat_hub: ChatHub = websocket.app.state.chat_hub
    authentication: AuthenticationService = websocket.app.state.authentication_service
    communities: CommunityService = websocket.app.state.community_service

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
        if not await communities.is_member(server_id, session.user.id):
            await websocket.close(code=4403, reason="Join this server to use its chat")
            return

        history = await communities.get_history(server_id)
        await chat_hub.connect(websocket, server_id, session.user, auth.token, history)
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

            if not await communities.is_member(server_id, session.user.id):
                await websocket.close(code=4403, reason="Server membership was revoked")
                return
            message = ChatMessage(
                id=secrets.token_urlsafe(12),
                sender_id=session.user.id,
                sender=session.user.user_name,
                text=message_input.text,
                created_at=datetime.now(timezone.utc),
            )
            await communities.add_message(server_id, message)
            await chat_hub.publish(server_id, message)
    except WebSocketDisconnect:
        pass
    finally:
        chat_hub.disconnect(websocket)
