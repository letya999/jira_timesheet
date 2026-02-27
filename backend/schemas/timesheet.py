from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional

class WorklogBase(BaseModel):
    date: date
    hours: float
    type: str # JIRA, MANUAL
    category: Optional[str] = None
    description: Optional[str] = None
    issue_id: Optional[int] = None

class WorklogResponse(WorklogBase):
    id: int
    issue_key: Optional[str] = None
    issue_summary: Optional[str] = None
    project_key: Optional[str] = None
    user_name: str
    
    model_config = ConfigDict(from_attributes=True)

class ManualLogCreate(BaseModel):
    date: date
    hours: float
    category: str
    description: Optional[str] = None
    issue_id: Optional[int] = None
    user_id: Optional[int] = None # For privileged users to log for others