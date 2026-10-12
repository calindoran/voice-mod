import secrets

from ..domain.accounts import Account
from ..domain.accounts import User


class WhitelistRepository:
    def __init__(self, accounts: list[Account]) -> None:
        self._users: dict[tuple[str, str], User] = {}
        for account in accounts:
            key = (account.phone_number, account.user_name)
            if key in self._users:
                raise ValueError("The whitelist contains a duplicate account")
            self._users[key] = User(
                id=secrets.token_urlsafe(8),
                phone_number=account.phone_number,
                user_name=account.user_name,
            )

    def find(self, phone_number: str, user_name: str) -> User | None:
        return self._users.get((phone_number, user_name))
