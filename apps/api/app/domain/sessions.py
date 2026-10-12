from dataclasses import dataclass

from .accounts import User


@dataclass(frozen=True)
class AuthSession:
    user: User
    expires_at: float
