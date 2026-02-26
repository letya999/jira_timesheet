from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from core.database import get_db
from models.org import Department, Division, Team
from schemas.org import (
    DepartmentCreate, DepartmentResponse, DepartmentSimple,
    DivisionCreate, DivisionResponse, DivisionSimple,
    TeamCreate, TeamResponse
)
from api.deps import require_role

router = APIRouter()

# --- Departments ---

@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).options(selectinload(Department.divisions).selectinload(Division.teams)))
    return result.scalars().all()

@router.post("/departments", response_model=DepartmentSimple, dependencies=[Depends(require_role(["Admin"]))])
async def create_department(dept_in: DepartmentCreate, db: AsyncSession = Depends(get_db)):
    db_dept = Department(name=dept_in.name)
    db.add(db_dept)
    await db.commit()
    await db.refresh(db_dept)
    return db_dept

# --- Divisions ---

@router.post("/divisions", response_model=DivisionSimple, dependencies=[Depends(require_role(["Admin"]))])
async def create_division(div_in: DivisionCreate, db: AsyncSession = Depends(get_db)):
    db_div = Division(name=div_in.name, department_id=div_in.department_id)
    db.add(db_div)
    await db.commit()
    await db.refresh(db_div)
    return db_div

# --- Teams ---

@router.post("/teams", response_model=TeamResponse, dependencies=[Depends(require_role(["Admin"]))])
async def create_team(team_in: TeamCreate, db: AsyncSession = Depends(get_db)):
    db_team = Team(name=team_in.name, division_id=team_in.division_id)
    db.add(db_team)
    await db.commit()
    await db.refresh(db_team)
    return db_team
