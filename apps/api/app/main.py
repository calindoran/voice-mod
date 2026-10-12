from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import auth, chat, health, servers
from .core.config import Settings, get_settings
from .infrastructure.chat_hub import ChatHub
from .infrastructure.community_repository import SQLiteCommunityRepository
from .infrastructure.session_store import InMemorySessionStore
from .infrastructure.whitelist_repository import WhitelistRepository
from .services.authentication import AuthenticationService
from .services.communities import CommunityService
from .services.voice import VoiceTokenService

logger = logging.getLogger(__name__)

OPENAPI_TAGS = [
    {"name": "Health", "description": "Process health and readiness checks."},
    {"name": "Authentication", "description": "Allowlist-based sign-in and session revocation."},
    {"name": "Community servers", "description": "Discover, create, join, and leave community servers."},
    {"name": "Community chat", "description": "Persistent, server-scoped real-time text chat."},
]
API_DESCRIPTION = """Voice Mod API for allowlisted sign-in, community servers, text chat, and voice.

Create or join a discoverable community server. Each server has a shared text chat and a LiveKit
voice room. The API issues a short-lived LiveKit room token only to joined members; audio media is
routed by LiveKit rather than streamed through FastAPI.

## WebSocket chat

Connect to `/ws/servers/{server_id}/chat`, then send `{"token": "<bearer-token>"}` as the first
text frame. After `ready` and `history` frames, send `{"text": "message"}` frames. WebSocket
routes are not represented in OpenAPI, so the protocol is documented here.
"""


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        if not config.allowed_users:
            logger.warning("The sign-in whitelist is empty; all sign-in attempts will be rejected")
        application.state.authentication_service = AuthenticationService(
            whitelist=WhitelistRepository(config.allowed_users, config.user_id_secret),
            sessions=InMemorySessionStore(),
        )
        community_service = CommunityService(SQLiteCommunityRepository(config.database_path))
        await community_service.initialize()
        application.state.community_service = community_service
        application.state.voice_token_service = VoiceTokenService(config)
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
    application.include_router(servers.router)
    application.include_router(chat.router)
    return application


app = create_app()
