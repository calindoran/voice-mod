from pydantic import BaseModel, ConfigDict

from ..domain.accounts import Account, User


class LoginRequest(Account):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"phoneNumber": "4155550123", "userName": "Alex"}
        }
    )


class LoginResponse(BaseModel):
    token: str
    user: User


class LogoutResponse(BaseModel):
    status: str


class WebSocketAuth(BaseModel):
    token: str


class HealthResponse(BaseModel):
    status: str
