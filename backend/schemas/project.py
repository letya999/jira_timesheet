from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class ProjectBase(BaseModel):
    jira_id: str
    key: str
    name: str
    is_active: bool = False

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    is_active: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

from datetime import date

class SprintResponse(BaseModel):
    id: int
    jira_id: str
    name: str
    state: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)

class ReleaseResponse(BaseModel):
    id: int
    jira_id: str
    name: str
    released: bool
    release_date: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)

class JiraProject(BaseModel):
    id: str
    key: str
    name: str
    projectTypeKey: Optional[str] = None
