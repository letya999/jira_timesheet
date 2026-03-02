from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)

class OrgUnit(Base):
    __tablename__ = "org_units"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("org_units.id"), nullable=True)

    reporting_period: Mapped[str] = mapped_column(String(50), default="weekly") # weekly, bi-weekly, monthly

    parent = relationship("OrgUnit", remote_side=[id], backref="children")
    jira_users = relationship("JiraUser", back_populates="org_unit")
    approval_routes = relationship("ApprovalRoute", back_populates="org_unit", cascade="all, delete-orphan")
    user_roles = relationship("UserOrgRole", back_populates="org_unit", cascade="all, delete-orphan")

class UserOrgRole(Base):
    __tablename__ = "user_org_roles"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    org_unit_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))

    user = relationship("User", backref="org_roles")
    org_unit = relationship("OrgUnit", back_populates="user_roles")
    role = relationship("Role")

class ApprovalRoute(Base):
    __tablename__ = "approval_routes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    org_unit_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"))
    target_type: Mapped[str] = mapped_column(String(50)) # 'leave', 'timesheet'
    step_order: Mapped[int] = mapped_column(Integer) # 1, 2, 3...
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))

    org_unit = relationship("OrgUnit", back_populates="approval_routes")
    role = relationship("Role")
