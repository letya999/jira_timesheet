from sqlalchemy import String, Integer, Boolean, ForeignKey, Table, Date, Column
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base
from datetime import date

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

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    issues = relationship("Issue", back_populates="project")
    releases = relationship("Release", back_populates="project")

class Sprint(Base):
    __tablename__ = "sprints"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    state: Mapped[str | None] = mapped_column(String(50)) # active, closed, future
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)

    issues = relationship("Issue", secondary=issue_sprints, back_populates="sprints")

class Release(Base):
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

class Issue(Base):
    __tablename__ = "issues"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jira_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    summary: Mapped[str] = mapped_column(String(1024))
    status: Mapped[str | None] = mapped_column(String(100), index=True)
    issue_type: Mapped[str | None] = mapped_column(String(50), index=True)
    
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("issues.id"), nullable=True)

    project = relationship("Project", back_populates="issues")
    parent = relationship("Issue", remote_side=[id], back_populates="subtasks")
    subtasks = relationship("Issue", back_populates="parent")
    worklogs = relationship("Worklog", back_populates="issue")
    
    sprints = relationship("Sprint", secondary=issue_sprints, back_populates="issues")
    releases = relationship("Release", secondary=issue_releases, back_populates="issues")
