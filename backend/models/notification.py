from sqlalchemy import String, Integer, ForeignKey, Boolean
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True) # Recipient
    sender_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True) # Sender (optional)
    
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(String(1024))
    type: Mapped[str] = mapped_column(String(50), default="info", index=True) # info, success, warning, error, timesheet_submitted, timesheet_approved, timesheet_rejected
    
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    
    # Optional linking to specific entity (like a TimesheetPeriod)
    related_entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    related_entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    sender = relationship("User", foreign_keys=[sender_id])
