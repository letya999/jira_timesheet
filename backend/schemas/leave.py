from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class LeaveType(StrEnum):
    VACATION = "VACATION"
    SICK_LEAVE = "SICK_LEAVE"
    DAY_OFF = "DAY_OFF"
    OTHER = "OTHER"


class LeaveStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class LeaveBase(BaseModel):
    type: LeaveType = LeaveType.VACATION
    start_date: date
    end_date: date
    reason: str | None = None


class LeaveCreate(LeaveBase):
    pass


class LeaveUpdate(BaseModel):
    status: LeaveStatus | None = None
    comment: str | None = None
    approver_id: int | None = None
    type: LeaveType | None = None
    start_date: date | None = None
    end_date: date | None = None
    reason: str | None = None


class LeaveResponse(LeaveBase):
    id: int
    user_id: int
    status: LeaveStatus
    approver_id: int | None = None
    comment: str | None = None
    current_step_order: int = 1
    created_at: datetime
    updated_at: datetime

    # Simple versions of related entities if needed
    user_full_name: str | None = None
    user_avatar_url: str | None = None
    approver_full_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TeamLeaveResponse(BaseModel):
    user_id: int
    full_name: str
    team_name: str
    leaves: list[LeaveResponse]

    model_config = ConfigDict(from_attributes=True)
