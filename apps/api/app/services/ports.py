from typing import Protocol

from ..domain.accounts import User
from ..domain.sessions import AuthSession


class AccountDirectory(Protocol):
    def find(self, phone_number: str, user_name: str) -> User | None: ...


class SessionRepository(Protocol):
    def create(self, user: User) -> tuple[str, AuthSession]: ...

    def get(self, token: str) -> AuthSession | None: ...

    def revoke(self, token: str) -> bool: ...
