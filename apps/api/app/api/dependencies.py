from fastapi import Request

from ..infrastructure.chat_hub import ChatHub
from ..services.authentication import AuthenticationService


def get_authentication_service(request: Request) -> AuthenticationService:
    return request.app.state.authentication_service


def get_chat_hub(request: Request) -> ChatHub:
    return request.app.state.chat_hub
