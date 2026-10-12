from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CommunityServer(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    name: str
    description: str
    owner_id: str
    owner_name: str
    member_count: int
    is_member: bool
    created_at: datetime
