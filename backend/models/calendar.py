from datetime import date

from sqlalchemy import Boolean, Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    country_code: Mapped[str] = mapped_column(String(10), nullable=True)
