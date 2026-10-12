from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..dependencies import get_authentication_service, get_chat_hub
from ...schemas.auth import LoginRequest, LoginResponse, LogoutResponse
from ...services.authentication import AuthenticationService
from ...infrastructure.chat_hub import ChatHub

router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Sign in with an allowlisted account",
    description=(
        "Signs in only when the phone number and username match a pair in the server-side "
        "ALLOWED_USERS_JSON setting. Phone numbers are normalized to digits before matching."
    ),
    responses={401: {"description": "The account is not on the sign-in whitelist."}},
)
async def login(
    credentials: LoginRequest,
    service: Annotated[AuthenticationService, Depends(get_authentication_service)],
) -> LoginResponse:
    session = service.authenticate(credentials)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phone number or username is not authorized",
        )
    token, user = session
    return LoginResponse(token=token, user=user)


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Revoke the current session",
    description="Revokes the bearer token and closes chat sockets authenticated with it.",
    responses={401: {"description": "The bearer token is missing, invalid, or expired."}},
)
async def logout(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    authentication: Annotated[AuthenticationService, Depends(get_authentication_service)],
    chat_hub: Annotated[ChatHub, Depends(get_chat_hub)],
) -> LogoutResponse:
    token = credentials.credentials if credentials else None
    if token is None or authentication.get_user(token) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or expired",
        )
    authentication.revoke(token)
    await chat_hub.revoke_token(token)
    return LogoutResponse(status="ok")
