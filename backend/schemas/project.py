from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    jira_id: str
    key: str
    name: str
    is_active: bool = False


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SprintBase(BaseModel):
    jira_id: str
    name: str
    state: str
    start_date: date | None = None
    end_date: date | None = None


class SprintResponse(SprintBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ReleaseBase(BaseModel):
    jira_id: str
    name: str
    released: bool
    release_date: date | None = None
    project_id: int


class ReleaseResponse(ReleaseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class IssueTypeBase(BaseModel):
    jira_id: str
    name: str
    icon_url: str | None = None
    is_subtask: bool = False


class IssueTypeResponse(IssueTypeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class IssueBase(BaseModel):
    jira_id: str
    key: str
    summary: str
    status: str | None = None
    issue_type: str | None = None
    project_id: int
    parent_id: int | None = None


class IssueResponse(IssueBase):
    id: int
    issue_type_obj: IssueTypeResponse | None = None
    model_config = ConfigDict(from_attributes=True)


class JiraProject(BaseModel):
    id: str
    key: str
    name: str
    projectTypeKey: str | None = None
