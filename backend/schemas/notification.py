from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class NotificationBase(BaseModel):
    user_id: int
    sender_id: Optional[int] = None
    title: str
    message: str
    type: str = "info"
    is_read: bool = False
    related_entity_id: Optional[int] = None
    related_entity_type: Optional[str] = None

class NotificationCreate(BaseModel):
    user_id: int
    sender_id: Optional[int] = None
    title: str
    message: str
    type: str = "info"
    related_entity_id: Optional[int] = None
    related_entity_type: Optional[str] = None

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class NotificationResponse(NotificationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    sender_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class NotificationStats(BaseModel):
    unread_count: int
