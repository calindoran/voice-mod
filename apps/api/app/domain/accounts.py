import re

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class Account(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    phone_number: str
    user_name: str = Field(max_length=50)

    @field_validator("phone_number")
    @classmethod
    def normalize_phone_number(cls, value: str) -> str:
        phone_number = re.sub(r"[\s()+.-]", "", value)
        if not phone_number.isdigit() or len(phone_number) < 10:
            raise ValueError("Phone number must contain at least 10 digits")
        return phone_number

    @field_validator("user_name")
    @classmethod
    def normalize_user_name(cls, value: str) -> str:
        user_name = value.strip()
        if not user_name:
            raise ValueError("User name cannot be empty")
        return user_name


class User(Account):
    id: str
