import secrets
import time
from dataclasses import dataclass

from ..domain.accounts import User


@dataclass(frozen=True)
class AuthSession:
    user: User
    expires_at: float


class InMemorySessionStore:
    def __init__(self, lifetime_seconds: int = 12 * 60 * 60) -> None:
        self._lifetime_seconds = lifetime_seconds
        self._sessions: dict[str, AuthSession] = {}

    def create(self, user: User) -> tuple[str, AuthSession]:
        token = secrets.token_urlsafe(32)
        session = AuthSession(user=user, expires_at=time.monotonic() + self._lifetime_seconds)
        self._sessions[token] = session
        return token, session

    def get(self, token: str) -> AuthSession | None:
        session = self._sessions.get(token)
        if session is not None and session.expires_at <= time.monotonic():
            self._sessions.pop(token, None)
            return None
        return session

    def revoke(self, token: str) -> bool:
        return self._sessions.pop(token, None) is not None
