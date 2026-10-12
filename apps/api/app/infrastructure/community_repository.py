from pathlib import Path
import secrets
from datetime import datetime, timezone

import aiosqlite

from ..domain.accounts import User
from ..domain.chat import ChatMessage
from ..domain.communities import CommunityServer

MESSAGE_HISTORY_LIMIT = 100


class SQLiteCommunityRepository:
    def __init__(self, database_path: Path) -> None:
        self._database_path = database_path

    async def initialize(self) -> None:
        self._database_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiosqlite.connect(self._database_path) as database:
            await database.executescript(
                """
                PRAGMA foreign_keys = ON;
                CREATE TABLE IF NOT EXISTS community_servers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    owner_id TEXT NOT NULL,
                    owner_name TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS community_memberships (
                    server_id TEXT NOT NULL REFERENCES community_servers(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL,
                    joined_at TEXT NOT NULL,
                    PRIMARY KEY (server_id, user_id)
                );
                CREATE TABLE IF NOT EXISTS community_messages (
                    id TEXT PRIMARY KEY,
                    server_id TEXT NOT NULL REFERENCES community_servers(id) ON DELETE CASCADE,
                    sender_id TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    text TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS community_messages_history
                    ON community_messages(server_id, created_at DESC);
                """
            )
            await database.commit()

    async def list_servers(self, user_id: str) -> list[CommunityServer]:
        async with aiosqlite.connect(self._database_path) as database:
            database.row_factory = aiosqlite.Row
            async with database.execute(
                """
                SELECT s.*, COUNT(m.user_id) AS member_count,
                    MAX(CASE WHEN m.user_id = ? THEN 1 ELSE 0 END) AS is_member
                FROM community_servers AS s
                LEFT JOIN community_memberships AS m ON m.server_id = s.id
                GROUP BY s.id
                ORDER BY s.created_at DESC
                """,
                (user_id,),
            ) as cursor:
                rows = await cursor.fetchall()
        return [self._server_from_row(row) for row in rows]

    async def get_server(self, server_id: str, user_id: str) -> CommunityServer | None:
        async with aiosqlite.connect(self._database_path) as database:
            database.row_factory = aiosqlite.Row
            async with database.execute(
                """
                SELECT s.*, COUNT(m.user_id) AS member_count,
                    MAX(CASE WHEN m.user_id = ? THEN 1 ELSE 0 END) AS is_member
                FROM community_servers AS s
                LEFT JOIN community_memberships AS m ON m.server_id = s.id
                WHERE s.id = ?
                GROUP BY s.id
                """,
                (user_id, server_id),
            ) as cursor:
                row = await cursor.fetchone()
        return self._server_from_row(row) if row else None

    async def create_server(
        self,
        name: str,
        description: str,
        owner: User,
    ) -> CommunityServer:
        server_id = secrets.token_urlsafe(12)
        now = datetime.now(timezone.utc).isoformat()
        async with aiosqlite.connect(self._database_path) as database:
            await database.execute(
                """INSERT INTO community_servers
                   (id, name, description, owner_id, owner_name, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (server_id, name, description, owner.id, owner.user_name, now),
            )
            await database.execute(
                "INSERT INTO community_memberships (server_id, user_id, joined_at) VALUES (?, ?, ?)",
                (server_id, owner.id, now),
            )
            await database.commit()
        server = await self.get_server(server_id, owner.id)
        if server is None:
            raise RuntimeError("Created community server could not be loaded")
        return server

    async def join_server(self, server_id: str, user: User) -> CommunityServer | None:
        now = datetime.now(timezone.utc).isoformat()
        async with aiosqlite.connect(self._database_path) as database:
            async with database.execute(
                "SELECT 1 FROM community_servers WHERE id = ?", (server_id,)
            ) as cursor:
                exists = await cursor.fetchone()
            if exists is None:
                return None
            await database.execute(
                """INSERT OR IGNORE INTO community_memberships
                   (server_id, user_id, joined_at) VALUES (?, ?, ?)""",
                (server_id, user.id, now),
            )
            await database.commit()
        return await self.get_server(server_id, user.id)

    async def leave_server(self, server_id: str, user_id: str) -> bool:
        async with aiosqlite.connect(self._database_path) as database:
            cursor = await database.execute(
                "DELETE FROM community_memberships WHERE server_id = ? AND user_id = ?",
                (server_id, user_id),
            )
            await database.commit()
            return cursor.rowcount > 0

    async def is_member(self, server_id: str, user_id: str) -> bool:
        async with aiosqlite.connect(self._database_path) as database:
            async with database.execute(
                """SELECT 1 FROM community_memberships
                   WHERE server_id = ? AND user_id = ?""",
                (server_id, user_id),
            ) as cursor:
                return await cursor.fetchone() is not None

    async def get_history(self, server_id: str) -> list[ChatMessage]:
        async with aiosqlite.connect(self._database_path) as database:
            database.row_factory = aiosqlite.Row
            async with database.execute(
                """
                SELECT * FROM (
                    SELECT rowid AS order_id, id, sender_id, sender, text, created_at
                    FROM community_messages
                    WHERE server_id = ?
                    ORDER BY created_at DESC, rowid DESC
                    LIMIT ?
                ) ORDER BY created_at ASC, order_id ASC
                """,
                (server_id, MESSAGE_HISTORY_LIMIT),
            ) as cursor:
                rows = await cursor.fetchall()
        return [
            ChatMessage(
                id=row["id"],
                sender_id=row["sender_id"],
                sender=row["sender"],
                text=row["text"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    async def add_message(self, server_id: str, message: ChatMessage) -> None:
        async with aiosqlite.connect(self._database_path) as database:
            await database.execute(
                """INSERT INTO community_messages
                   (id, server_id, sender_id, sender, text, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    message.id,
                    server_id,
                    message.sender_id,
                    message.sender,
                    message.text,
                    message.created_at.isoformat(),
                ),
            )
            await database.execute(
                """DELETE FROM community_messages
                   WHERE server_id = ? AND id NOT IN (
                       SELECT id FROM community_messages
                       WHERE server_id = ?
                       ORDER BY created_at DESC, rowid DESC LIMIT ?
                   )""",
                (server_id, server_id, MESSAGE_HISTORY_LIMIT),
            )
            await database.commit()

    @staticmethod
    def _server_from_row(row: aiosqlite.Row) -> CommunityServer:
        return CommunityServer(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            owner_id=row["owner_id"],
            owner_name=row["owner_name"],
            member_count=row["member_count"],
            is_member=bool(row["is_member"]),
            created_at=row["created_at"],
        )
