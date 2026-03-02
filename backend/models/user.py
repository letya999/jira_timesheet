from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import AuditMixin, Base


class JiraUser(Base):
    __tablename__ = "jira_users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_account_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Resource Management Fields moved here
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    weekly_quota: Mapped[int] = mapped_column(default=40)
    org_unit_id: Mapped[int | None] = mapped_column(ForeignKey("org_units.id"), nullable=True)

    user = relationship("User", back_populates="jira_user", uselist=False)
    org_unit = relationship("OrgUnit", back_populates="jira_users")
    worklogs = relationship("Worklog", back_populates="jira_user")

    @property
    def user_id(self) -> int | None:
        return self.user.id if self.user else None


class User(Base, AuditMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="Employee", index=True)  # Admin, CEO, PM, Employee

    # Login access control only
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    needs_password_change: Mapped[bool] = mapped_column(Boolean, default=False)

    jira_user_id: Mapped[int | None] = mapped_column(ForeignKey("jira_users.id"), nullable=True)
    jira_user = relationship("JiraUser", back_populates="user")
