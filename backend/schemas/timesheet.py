from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional

class WorklogBase(BaseModel):
    date: date
    hours: float
    type: str = "JIRA" # JIRA, MANUAL
    category_id: Optional[int] = None
    description: Optional[str] = None

class ManualLogCreate(BaseModel):
    date: date
    hours: float
    category: str # "Vacation", "Jira Task", etc.
    description: Optional[str] = None
    user_id: Optional[int] = None # jira_user_id
    issue_id: Optional[int] = None

class WorklogResponse(WorklogBase):
    id: int
    status: str
    source_created_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested info for frontend
    user_name: Optional[str] = None
    jira_account_id: Optional[str] = None
    issue_key: Optional[str] = None
    issue_summary: Optional[str] = None
    project_name: Optional[str] = None
    category: Optional[str] = None # Added for compatibility
    category_name: Optional[str] = None
    team_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TimesheetPeriodBase(BaseModel):
    user_id: int
    start_date: date
    end_date: date
    status: str = "OPEN"

class TimesheetPeriodResponse(TimesheetPeriodBase):
    id: int
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Summary info
    total_hours: Optional[float] = 0.0
    expected_hours: Optional[float] = 0.0
    working_days: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class TimesheetSubmitRequest(BaseModel):
    start_date: date
    end_date: date

class TimesheetApprovalRequest(BaseModel):
    status: str # APPROVED or REJECTED
    comment: Optional[str] = None
