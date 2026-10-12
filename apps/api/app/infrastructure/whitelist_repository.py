import hashlib
import hmac

from ..domain.accounts import Account
from ..domain.accounts import User


class WhitelistRepository:
    def __init__(self, accounts: list[Account], user_id_secret: str) -> None:
        self._user_id_secret = user_id_secret.encode()
        self._users: dict[tuple[str, str], User] = {}
        for account in accounts:
            key = (account.phone_number, account.user_name)
            if key in self._users:
                raise ValueError("The whitelist contains a duplicate account")
            stable_id = hmac.new(
                self._user_id_secret,
                f"{account.phone_number}\0{account.user_name}".encode(),
                hashlib.sha256,
            ).hexdigest()[:24]
            self._users[key] = User(
                id=stable_id,
                phone_number=account.phone_number,
                user_name=account.user_name,
            )

    def find(self, phone_number: str, user_name: str) -> User | None:
        return self._users.get((phone_number, user_name))
