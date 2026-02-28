from sqlalchemy import String, Integer, ForeignKey, Date, Float, DateTime, func
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base
from datetime import date, datetime

class Worklog(Base):
    __tablename__ = "worklogs"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="JIRA") # JIRA, MANUAL
    
    date: Mapped[date] = mapped_column(Date, index=True)
    hours: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="APPROVED", index=True) # DRAFT, SUBMITTED, APPROVED, REJECTED
    
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
    
    status: Mapped[str] = mapped_column(String(50), default="OPEN", index=True) # OPEN, SUBMITTED, APPROVED, REJECTED
    
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    
    comment: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    
    user = relationship("User", foreign_keys=[user_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
