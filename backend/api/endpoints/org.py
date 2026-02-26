from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from core.database import get_db
from models.org import Department, Division, Team
from models.user import JiraUser
from schemas.org import (
    DepartmentCreate, DepartmentResponse, DepartmentSimple,
    DivisionCreate, DivisionResponse, DivisionSimple,
    TeamCreate, TeamResponse
)
from schemas.user import JiraUserResponse
from schemas.pagination import PaginatedResponse
from api.deps import require_role
from sqlalchemy import func

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

# --- Employees (Jira Users) ---

@router.get("/employees", response_model=PaginatedResponse[JiraUserResponse])
async def get_employees(
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    size: int = 50
):
    skip = (page - 1) * size
    
    # Total count
    count_stmt = select(func.count()).select_from(JiraUser)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    # Iterms
    stmt = select(JiraUser).offset(skip).limit(size)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    pages = (total + size - 1) // size
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }
