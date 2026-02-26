from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from models.base import Base

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    divisions = relationship("Division", back_populates="department")

class Division(Base):
    __tablename__ = "divisions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    department = relationship("Department", back_populates="divisions")
    teams = relationship("Team", back_populates="division")

class Team(Base):
    __tablename__ = "teams"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    division_id: Mapped[int] = mapped_column(ForeignKey("divisions.id"))
    division = relationship("Division", back_populates="teams")
    users = relationship("User", back_populates="team")
