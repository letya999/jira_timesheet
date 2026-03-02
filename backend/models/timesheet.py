from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class Worklog(Base):
    __tablename__ = "worklogs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="JIRA")  # JIRA, MANUAL

    date: Mapped[date] = mapped_column(Date, index=True)
    hours: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="APPROVED", index=True)
    # Statuses: DRAFT, SUBMITTED, APPROVED, REJECTED

    # Linked to standardized categories
    category_id: Mapped[int | None] = mapped_column(ForeignKey("worklog_categories.id"), nullable=True)
    source_created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    jira_user_id: Mapped[int] = mapped_column(ForeignKey("jira_users.id"))
    issue_id: Mapped[int | None] = mapped_column(ForeignKey("issues.id"), nullable=True)

    category = relationship("WorklogCategory")
    jira_user = relationship("JiraUser", back_populates="worklogs")
    issue = relationship("Issue", back_populates="worklogs")


class TimesheetPeriod(Base):
    __tablename__ = "timesheet_periods"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date] = mapped_column(Date, index=True)

    status: Mapped[str] = mapped_column(String(50), default="OPEN", index=True)  # OPEN, SUBMITTED, APPROVED, REJECTED

    current_step_order: Mapped[int] = mapped_column(Integer, default=1)

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Legacy field
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    comment: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    approval_steps = relationship(
        "TimesheetApprovalStep", back_populates="timesheet_period", cascade="all, delete-orphan"
    )


class TimesheetApprovalStep(Base):
    __tablename__ = "timesheet_approval_steps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timesheet_period_id: Mapped[int] = mapped_column(ForeignKey("timesheet_periods.id"))
    step_order: Mapped[int] = mapped_column(Integer)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))

    status: Mapped[str] = mapped_column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    acted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    timesheet_period = relationship("TimesheetPeriod", back_populates="approval_steps")
    role = relationship("Role")
    approver = relationship("User")
