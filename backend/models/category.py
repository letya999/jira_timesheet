from sqlalchemy import String, Boolean
from sqlalchemy.orm import mapped_column, Mapped
from models.base import Base

class WorklogCategory(Base):
    __tablename__ = "worklog_categories"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
