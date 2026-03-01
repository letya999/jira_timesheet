from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Optional
from enum import Enum

class LeaveType(str, Enum):
    VACATION = "VACATION"
    SICK_LEAVE = "SICK_LEAVE"
    DAY_OFF = "DAY_OFF"
    OTHER = "OTHER"

class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"

class LeaveBase(BaseModel):
    type: LeaveType = LeaveType.VACATION
    start_date: date
    end_date: date
    reason: Optional[str] = None

class LeaveCreate(LeaveBase):
    pass

class LeaveUpdate(BaseModel):
    status: Optional[LeaveStatus] = None
    comment: Optional[str] = None
    approver_id: Optional[int] = None
    type: Optional[LeaveType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None

class LeaveResponse(LeaveBase):
    id: int
    user_id: int
    status: LeaveStatus
    approver_id: Optional[int] = None
    comment: Optional[str] = None
    current_step_order: int = 1
    created_at: datetime
    updated_at: datetime
    
    # Simple versions of related entities if needed
    user_full_name: Optional[str] = None
    approver_full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TeamLeaveResponse(BaseModel):
    user_id: int
    full_name: str
    team_name: str
    leaves: list[LeaveResponse]

    model_config = ConfigDict(from_attributes=True)
