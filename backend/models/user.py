from sqlalchemy import String, Integer, Column, ForeignKey, Boolean
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    jira_account_id: Mapped[str] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="Employee") # Admin, CEO, PM, Employee
    weekly_quota: Mapped[int] = mapped_column(default=40)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=True)
    
    team = relationship("Team", back_populates="users")
    manual_logs = relationship("ManualLog", back_populates="user")
