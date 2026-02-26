from sqlalchemy import String, Integer, ForeignKey, Date, Float
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base
from datetime import date

class Worklog(Base):
    __tablename__ = "worklogs"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True) # ID from Jira
    type: Mapped[str] = mapped_column(String(50), default="JIRA") # JIRA, MANUAL
    category: Mapped[str | None] = mapped_column(String(255), nullable=True) # For Manual: Vacation, Sick, etc.
    
    date: Mapped[date] = mapped_column(Date)
    time_spent_hours: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    
    jira_user_id: Mapped[int] = mapped_column(ForeignKey("jira_users.id"))
    issue_id: Mapped[int | None] = mapped_column(ForeignKey("issues.id"), nullable=True)
    
    jira_user = relationship("JiraUser", back_populates="worklogs")
    issue = relationship("Issue", back_populates="worklogs")