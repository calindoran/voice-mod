from ..domain.accounts import Account, User
from ..domain.sessions import AuthSession
from .ports import AccountDirectory, SessionRepository


class AuthenticationService:
    def __init__(
        self,
        whitelist: AccountDirectory,
        sessions: SessionRepository,
    ) -> None:
        self._whitelist = whitelist
        self._sessions = sessions

    def authenticate(self, credentials: Account) -> tuple[str, User] | None:
        user = self._whitelist.find(credentials.phone_number, credentials.user_name)
        if user is None:
            return None
        token, _ = self._sessions.create(user)
        return token, user

    def get_session(self, token: str) -> AuthSession | None:
        return self._sessions.get(token)

    def get_user(self, token: str) -> User | None:
        session = self.get_session(token)
        return session.user if session else None

    def revoke(self, token: str) -> bool:
        return self._sessions.revoke(token)
