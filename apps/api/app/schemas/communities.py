from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class CreateServerRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str = Field(min_length=1, max_length=50)
    description: str = Field(default="", max_length=240)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Server name cannot be empty")
        return name

    @field_validator("description")
    @classmethod
    def trim_description(cls, value: str) -> str:
        return value.strip()


class VoiceTokenResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    livekit_url: str
    token: str
    room_name: str
