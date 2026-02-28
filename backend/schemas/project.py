from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime

class ProjectBase(BaseModel):
    jira_id: str
    key: str
    name: str
    is_active: bool = False

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SprintBase(BaseModel):
    jira_id: str
    name: str
    state: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class SprintResponse(SprintBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ReleaseBase(BaseModel):
    jira_id: str
    name: str
    released: bool
    release_date: Optional[date] = None
    project_id: int

class ReleaseResponse(ReleaseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class JiraProject(BaseModel):
    id: str
    key: str
    name: str
    projectTypeKey: Optional[str] = None
