from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
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
    status: str
    
    model_config = ConfigDict(from_attributes=True)

class ManualLogCreate(BaseModel):
    date: date
    hours: float
    category: str
    description: Optional[str] = None
    issue_id: Optional[int] = None
    user_id: Optional[int] = None # For privileged users to log for others

class TimesheetPeriodBase(BaseModel):
    user_id: int
    start_date: date
    end_date: date
    status: str
    comment: Optional[str] = None

class TimesheetPeriodResponse(TimesheetPeriodBase):
    id: int
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class TimesheetSubmitRequest(BaseModel):
    start_date: date
    end_date: date

class TimesheetApprovalRequest(BaseModel):
    status: str # APPROVED or REJECTED
    comment: Optional[str] = None
