from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import mapped_column, Mapped
from models.base import Base

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
