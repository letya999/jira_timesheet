from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional

class JiraLogBase(BaseModel):
    jira_account_id: str
    date: date
    time_spent_hours: float
    issue_key: str
    summary: Optional[str] = None
    sprint: Optional[str] = None
    release: Optional[str] = None

class JiraLogResponse(JiraLogBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ManualLogBase(BaseModel):
    date: date
    time_spent_hours: float
    category: str
    description: Optional[str] = None

class ManualLogCreate(ManualLogBase):
    pass

class ManualLogResponse(ManualLogBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)