from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import auth, chat, health
from .core.config import Settings, get_settings
from .services.authentication import AuthenticationService
from .infrastructure.chat_hub import ChatHub
from .infrastructure.session_store import InMemorySessionStore
from .infrastructure.whitelist_repository import WhitelistRepository

logger = logging.getLogger(__name__)

OPENAPI_TAGS = [
    {"name": "Health", "description": "Process health and readiness checks."},
    {"name": "Authentication", "description": "Allowlist-based sign-in and session revocation."},
    {"name": "Chat", "description": "Real-time chat over an authenticated WebSocket."},
]
API_DESCRIPTION = """Voice Mod API for allowlisted sign-in and a shared live chat room.

## Authentication

Sign in with a phone number and username present in the server-side `ALLOWED_USERS_JSON` list.
Use the returned bearer token with `POST /auth/logout`.

## WebSocket chat

Connect to `/ws/chat`, then send `{"token": "<bearer-token>"}` as the first text frame.
After a `ready` and `history` frame, send `{"text": "message"}` frames. The server broadcasts
validated messages to every authenticated connection. WebSocket routes are not represented in
OpenAPI; this protocol is documented here because Swagger UI describes HTTP operations only.
"""


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        if not config.allowed_users:
            logger.warning("The sign-in whitelist is empty; all sign-in attempts will be rejected")
        application.state.authentication_service = AuthenticationService(
            whitelist=WhitelistRepository(config.allowed_users),
            sessions=InMemorySessionStore(),
        )
        application.state.chat_hub = ChatHub()
        yield

    application = FastAPI(
        title=config.app_name,
        version=config.app_version,
        description=API_DESCRIPTION,
        openapi_tags=OPENAPI_TAGS,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.include_router(health.router)
    application.include_router(auth.router)
    application.include_router(chat.router)
    return application


app = create_app()
