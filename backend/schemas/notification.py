from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    user_id: int
    sender_id: int | None = None
    title: str
    message: str
    type: str = "info"
    is_read: bool = False
    related_entity_id: int | None = None
    related_entity_type: str | None = None


class NotificationCreate(BaseModel):
    user_id: int
    sender_id: int | None = None
    title: str
    message: str
    type: str = "info"
    related_entity_id: int | None = None
    related_entity_type: str | None = None


class NotificationUpdate(BaseModel):
    is_read: bool | None = None


class NotificationResponse(NotificationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    sender_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class NotificationStats(BaseModel):
    unread_count: int
