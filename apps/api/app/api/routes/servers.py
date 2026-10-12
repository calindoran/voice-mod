from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from ...api.dependencies import (
    get_chat_hub,
    get_community_service,
    get_current_user,
    get_voice_token_service,
)
from ...domain.accounts import User
from ...domain.communities import CommunityServer
from ...infrastructure.chat_hub import ChatHub
from ...schemas.communities import CreateServerRequest, VoiceTokenResponse
from ...services.communities import CommunityService, OwnerCannotLeaveError
from ...services.voice import LiveKitNotConfiguredError, VoiceTokenService

router = APIRouter(prefix="/servers", tags=["Community servers"])


@router.get(
    "",
    response_model=list[CommunityServer],
    summary="Browse community servers",
    description="Lists discoverable servers and indicates which ones the current user has joined.",
)
async def list_servers(
    user: Annotated[User, Depends(get_current_user)],
    communities: Annotated[CommunityService, Depends(get_community_service)],
) -> list[CommunityServer]:
    return await communities.list_servers(user.id)


@router.post(
    "",
    response_model=CommunityServer,
    status_code=status.HTTP_201_CREATED,
    summary="Create a community server",
    description="Creates a discoverable server and automatically makes the creator its first member.",
)
async def create_server(
    request: CreateServerRequest,
    user: Annotated[User, Depends(get_current_user)],
    communities: Annotated[CommunityService, Depends(get_community_service)],
) -> CommunityServer:
    return await communities.create_server(request.name, request.description, user)


@router.get(
    "/{server_id}",
    response_model=CommunityServer,
    summary="Get a community server",
)
async def get_server(
    server_id: str,
    user: Annotated[User, Depends(get_current_user)],
    communities: Annotated[CommunityService, Depends(get_community_service)],
) -> CommunityServer:
    server = await communities.get_server(server_id, user.id)
    if server is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    return server


@router.post(
    "/{server_id}/join",
    response_model=CommunityServer,
    summary="Join a community server",
)
async def join_server(
    server_id: str,
    user: Annotated[User, Depends(get_current_user)],
    communities: Annotated[CommunityService, Depends(get_community_service)],
) -> CommunityServer:
    server = await communities.join_server(server_id, user)
    if server is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")
    return server


@router.post(
    "/{server_id}/leave",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Leave a community server",
    responses={409: {"description": "The server owner cannot leave their own server."}},
)
async def leave_server(
    server_id: str,
    user: Annotated[User, Depends(get_current_user)],
    communities: Annotated[CommunityService, Depends(get_community_service)],
    chat_hub: Annotated[ChatHub, Depends(get_chat_hub)],
) -> Response:
    try:
        left = await communities.leave_server(server_id, user)
    except OwnerCannotLeaveError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The owner cannot leave this server.",
        ) from error
    if not left:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server membership not found")
    await chat_hub.revoke_membership(server_id, user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{server_id}/voice-token",
    response_model=VoiceTokenResponse,
    summary="Get a LiveKit token for a server voice room",
    responses={
        403: {"description": "The current user is not a member of this server."},
        503: {"description": "LiveKit credentials have not been configured."},
    },
)
async def create_voice_token(
    server_id: str,
    user: Annotated[User, Depends(get_current_user)],
    communities: Annotated[CommunityService, Depends(get_community_service)],
    voice_tokens: Annotated[VoiceTokenService, Depends(get_voice_token_service)],
) -> VoiceTokenResponse:
    if not await communities.is_member(server_id, user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join this server before entering its voice room.",
        )
    try:
        return voice_tokens.create_room_token(user, server_id)
    except LiveKitNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit is not configured on this API server.",
        ) from error
