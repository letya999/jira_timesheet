from datetime import date

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import AuditMixin, Base

# Association tables for M2M relationships
issue_sprints = Table(
    "issue_sprints",
    Base.metadata,
    Column("issue_id", Integer, ForeignKey("issues.id"), primary_key=True),
    Column("sprint_id", Integer, ForeignKey("sprints.id"), primary_key=True),
)

issue_releases = Table(
    "issue_releases",
    Base.metadata,
    Column("issue_id", Integer, ForeignKey("issues.id"), primary_key=True),
    Column("release_id", Integer, ForeignKey("releases.id"), primary_key=True),
)


class Project(Base, AuditMixin):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    issues = relationship("Issue", back_populates="project")
    releases = relationship("Release", back_populates="project")


class Sprint(Base, AuditMixin):
    __tablename__ = "sprints"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    state: Mapped[str | None] = mapped_column(String(50))  # active, closed, future
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)

    issues = relationship("Issue", secondary=issue_sprints, back_populates="sprints")


class Release(Base, AuditMixin):
    __tablename__ = "releases"
    __table_args__ = {"extend_existing": True}
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    released: Mapped[bool] = mapped_column(Boolean, default=False)
    release_date: Mapped[date | None] = mapped_column(Date)

    project = relationship("Project", back_populates="releases")
    issues = relationship("Issue", secondary=issue_releases, back_populates="releases")


class IssueType(Base, AuditMixin):
    __tablename__ = "issue_types"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    icon_url: Mapped[str | None] = mapped_column(String(1024))
    is_subtask: Mapped[bool] = mapped_column(Boolean, default=False)

    issues = relationship("Issue", back_populates="issue_type_obj")


class Issue(Base, AuditMixin):
    __tablename__ = "issues"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    summary: Mapped[str] = mapped_column(String(1024))
    status: Mapped[str | None] = mapped_column(String(100), index=True)
    issue_type: Mapped[str | None] = mapped_column(String(50), index=True)  # Keep for backward compatibility or migration
    issue_type_id: Mapped[int | None] = mapped_column(ForeignKey("issue_types.id"), nullable=True)

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("issues.id"), nullable=True)

    project = relationship("Project", back_populates="issues")
    issue_type_obj = relationship("IssueType", back_populates="issues")
    parent = relationship("Issue", remote_side=[id], back_populates="subtasks")
    subtasks = relationship("Issue", back_populates="parent")
    worklogs = relationship("Worklog", back_populates="issue")

    sprints = relationship("Sprint", secondary=issue_sprints, back_populates="issues")
    releases = relationship("Release", secondary=issue_releases, back_populates="issues")
