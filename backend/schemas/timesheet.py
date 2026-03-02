from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class WorklogBase(BaseModel):
    date: date
    hours: float
    type: str = "JIRA" # JIRA, MANUAL
    category_id: int | None = None
    description: str | None = None

class ManualLogCreate(BaseModel):
    date: date
    hours: float
    category: str # "Vacation", "Jira Task", etc.
    description: str | None = None
    user_id: int | None = None # jira_user_id
    issue_id: int | None = None

class WorklogResponse(WorklogBase):
    id: int
    status: str
    source_created_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # Nested info for frontend
    user_name: str | None = None
    jira_account_id: str | None = None
    issue_key: str | None = None
    issue_summary: str | None = None
    project_name: str | None = None
    category: str | None = None # Added for compatibility
    category_name: str | None = None
    team_name: str | None = None

    model_config = ConfigDict(from_attributes=True)

class TimesheetPeriodBase(BaseModel):
    user_id: int
    start_date: date
    end_date: date
    status: str = "OPEN"

class TimesheetPeriodResponse(TimesheetPeriodBase):
    id: int
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    approved_by_id: int | None = None
    comment: str | None = None
    created_at: datetime
    updated_at: datetime

    # Summary info
    total_hours: float | None = 0.0
    expected_hours: float | None = 0.0
    working_days: int | None = 0

    model_config = ConfigDict(from_attributes=True)

class TimesheetSubmitRequest(BaseModel):
    start_date: date
    end_date: date

class TimesheetApprovalRequest(BaseModel):
    status: str # APPROVED or REJECTED
    comment: str | None = None
