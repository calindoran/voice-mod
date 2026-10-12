from ..domain.accounts import User
from ..domain.chat import ChatMessage
from ..domain.communities import CommunityServer
from .ports import CommunityRepository


class OwnerCannotLeaveError(Exception):
    pass


class CommunityService:
    def __init__(self, repository: CommunityRepository) -> None:
        self._repository = repository

    async def initialize(self) -> None:
        await self._repository.initialize()

    async def list_servers(self, user_id: str) -> list[CommunityServer]:
        return await self._repository.list_servers(user_id)

    async def get_server(self, server_id: str, user_id: str) -> CommunityServer | None:
        return await self._repository.get_server(server_id, user_id)

    async def create_server(
        self,
        name: str,
        description: str,
        owner: User,
    ) -> CommunityServer:
        return await self._repository.create_server(name, description, owner)

    async def join_server(self, server_id: str, user: User) -> CommunityServer | None:
        return await self._repository.join_server(server_id, user)

    async def leave_server(self, server_id: str, user: User) -> bool:
        server = await self._repository.get_server(server_id, user.id)
        if server is None:
            return False
        if server.owner_id == user.id:
            raise OwnerCannotLeaveError
        return await self._repository.leave_server(server_id, user.id)

    async def is_member(self, server_id: str, user_id: str) -> bool:
        return await self._repository.is_member(server_id, user_id)

    async def get_history(self, server_id: str) -> list[ChatMessage]:
        return await self._repository.get_history(server_id)

    async def add_message(self, server_id: str, message: ChatMessage) -> None:
        await self._repository.add_message(server_id, message)
