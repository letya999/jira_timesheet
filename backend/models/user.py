from sqlalchemy import String, Integer, Column, ForeignKey, Boolean
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base

class JiraUser(Base):
    __tablename__ = "jira_users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_account_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user = relationship("User", back_populates="jira_user", uselist=False)
    worklogs = relationship("Worklog", back_populates="jira_user")

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="Employee") # Admin, CEO, PM, Employee
    weekly_quota: Mapped[int] = mapped_column(default=40)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)
    jira_user_id: Mapped[int | None] = mapped_column(ForeignKey("jira_users.id"), nullable=True)
    
    team = relationship("Team", back_populates="users")
    jira_user = relationship("JiraUser", back_populates="user")
