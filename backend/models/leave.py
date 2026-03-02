import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class LeaveType(enum.StrEnum):
    VACATION = "VACATION"
    SICK_LEAVE = "SICK_LEAVE"
    DAY_OFF = "DAY_OFF"
    OTHER = "OTHER"

class LeaveStatus(enum.StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    type: Mapped[LeaveType] = mapped_column(String(50), default=LeaveType.VACATION)
    status: Mapped[LeaveStatus] = mapped_column(String(50), default=LeaveStatus.PENDING, index=True)

    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date, index=True)

    reason: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    current_step_order: Mapped[int] = mapped_column(Integer, default=1)

    # Legacy field - keeping for fallback
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="leave_requests")
    approver = relationship("User", foreign_keys=[approver_id])
    approval_steps = relationship("LeaveApprovalStep", back_populates="leave_request", cascade="all, delete-orphan")

class LeaveApprovalStep(Base):
    __tablename__ = "leave_approval_steps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    leave_request_id: Mapped[int] = mapped_column(ForeignKey("leave_requests.id"))
    step_order: Mapped[int] = mapped_column(Integer)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))

    status: Mapped[LeaveStatus] = mapped_column(String(50), default=LeaveStatus.PENDING)
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    acted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    leave_request = relationship("LeaveRequest", back_populates="approval_steps")
    role = relationship("Role")
    approver = relationship("User")
