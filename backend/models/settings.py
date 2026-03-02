from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from models.base import AuditMixin, Base


class SystemSettings(Base, AuditMixin):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)
