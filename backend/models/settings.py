from sqlalchemy import String, JSON
from sqlalchemy.orm import mapped_column, Mapped
from models.base import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)
