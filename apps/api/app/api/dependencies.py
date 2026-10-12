from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..domain.accounts import User
from ..infrastructure.chat_hub import ChatHub
from ..services.authentication import AuthenticationService
from ..services.communities import CommunityService
from ..services.voice import VoiceTokenService

bearer_scheme = HTTPBearer(auto_error=False)


def get_authentication_service(request: Request) -> AuthenticationService:
    return request.app.state.authentication_service


def get_chat_hub(request: Request) -> ChatHub:
    return request.app.state.chat_hub


def get_community_service(request: Request) -> CommunityService:
    return request.app.state.community_service


def get_voice_token_service(request: Request) -> VoiceTokenService:
    return request.app.state.voice_token_service


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    authentication: Annotated[AuthenticationService, Depends(get_authentication_service)],
) -> User:
    token = credentials.credentials if credentials else None
    user = authentication.get_user(token) if token else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or expired",
        )
    return user
