from sqlalchemy import String, Integer, ForeignKey, Date, Float
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base
from datetime import date

class JiraLog(Base):
    __tablename__ = "jira_logs"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_account_id: Mapped[str] = mapped_column(String(255), index=True)
    date: Mapped[date] = mapped_column(Date)
    time_spent_hours: Mapped[float] = mapped_column(Float)
    issue_key: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(String(1024), nullable=True)
    sprint: Mapped[str] = mapped_column(String(255), nullable=True)
    release: Mapped[str] = mapped_column(String(255), nullable=True)

class ManualLog(Base):
    __tablename__ = "manual_logs"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    date: Mapped[date] = mapped_column(Date)
    time_spent_hours: Mapped[float] = mapped_column(Float)
    category: Mapped[str] = mapped_column(String(255)) # Vacation, Training, Bench
    description: Mapped[str] = mapped_column(String(1024), nullable=True)
    
    user = relationship("User", back_populates="manual_logs")