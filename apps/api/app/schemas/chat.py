from pydantic import BaseModel, Field, field_validator


class ChatMessageInput(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

    @field_validator("text")
    @classmethod
    def trim_message(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("Message cannot be empty")
        return text
