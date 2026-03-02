from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class AuditMixin:
    """
    Mixin to enable automatic auditing for a model.
    Models inheriting from this will have their changes logged to audit_logs.
    """
    pass


class Base(DeclarativeBase):
    """
    Base class for all models.
    Includes automatic timestamp fields for all tables.
    """

    # Using sort_order to ensure these are at the end of the table
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), sort_order=999)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), sort_order=1000
    )
