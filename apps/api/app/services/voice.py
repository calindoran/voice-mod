from datetime import timedelta

from livekit import api

from ..core.config import Settings
from ..domain.accounts import User
from ..schemas.communities import VoiceTokenResponse


class LiveKitNotConfiguredError(Exception):
    pass


class VoiceTokenService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def create_room_token(self, user: User, server_id: str) -> VoiceTokenResponse:
        livekit_url, api_key, api_secret = self._credentials()
        room_name = f"voice-{server_id}"
        token = (
            api.AccessToken(
                api_key,
                api_secret,
            )
            .with_identity(user.id)
            .with_name(user.user_name)
            .with_ttl(timedelta(minutes=15))
            .with_grants(
                api.VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=True,
                    can_publish_sources=["microphone"],
                    can_subscribe=True,
                )
            )
            .to_jwt()
        )
        return VoiceTokenResponse(
            livekit_url=livekit_url,
            token=token,
            room_name=room_name,
        )

    def _credentials(self) -> tuple[str, str, str]:
        livekit_url = self._settings.livekit_url.strip()
        api_key = self._settings.livekit_api_key.strip()
        api_secret = self._settings.livekit_api_secret.strip()
        configured_values = (livekit_url, api_key, api_secret)
        if self._settings.app_environment == "development":
            return (
                livekit_url or "ws://127.0.0.1:7880",
                api_key or "devkey",
                api_secret or "secret",
            )
        if all(configured_values):
            return livekit_url, api_key, api_secret
        raise LiveKitNotConfiguredError
