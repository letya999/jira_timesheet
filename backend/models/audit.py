from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
    from sqlalchemy.sql import func
    from .base import Base

    class AuditLog(Base):
        __tablename__ = "audit_logs"

        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
        action = Column(String, nullable=False) # e.g., "UPDATE_USER", "APPROVE_TIMESHEET"
        target_type = Column(String, nullable=False) # e.g., "User", "TimesheetPeriod"
        target_id = Column(String, nullable=True)
        payload = Column(JSON, nullable=True) # The data changed or sent
        ip_address = Column(String, nullable=True)
        created_at = Column(DateTime(timezone=True), server_default=func.now())
    