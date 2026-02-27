from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from core.database import get_db
from models.org import Department, Division, Team
from models.user import JiraUser
from schemas.org import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse, DepartmentSimple,
    DivisionCreate, DivisionUpdate, DivisionResponse, DivisionSimple,
    TeamCreate, TeamUpdate, TeamResponse
)
from schemas.user import JiraUserResponse, JiraUserUpdate
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

@router.patch("/departments/{dept_id}", response_model=DepartmentSimple, dependencies=[Depends(require_role(["Admin"]))])
async def update_department(dept_id: int, dept_in: DepartmentUpdate, db: AsyncSession = Depends(get_db)):
    db_dept = await db.get(Department, dept_id)
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db_dept.name = dept_in.name
    await db.commit()
    await db.refresh(db_dept)
    return db_dept

@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role(["Admin"]))])
async def delete_department(dept_id: int, db: AsyncSession = Depends(get_db)):
    db_dept = await db.get(Department, dept_id)
    if not db_dept:
        raise HTTPException(status_code=404, detail="Department not found")
    await db.delete(db_dept)
    await db.commit()
    return None

# --- Divisions ---

@router.post("/divisions", response_model=DivisionSimple, dependencies=[Depends(require_role(["Admin"]))])
async def create_division(div_in: DivisionCreate, db: AsyncSession = Depends(get_db)):
    db_div = Division(name=div_in.name, department_id=div_in.department_id)
    db.add(db_div)
    await db.commit()
    await db.refresh(db_div)
    return db_div

@router.patch("/divisions/{div_id}", response_model=DivisionSimple, dependencies=[Depends(require_role(["Admin"]))])
async def update_division(div_id: int, div_in: DivisionUpdate, db: AsyncSession = Depends(get_db)):
    db_div = await db.get(Division, div_id)
    if not db_div:
        raise HTTPException(status_code=404, detail="Division not found")
    if div_in.name is not None:
        db_div.name = div_in.name
    if div_in.department_id is not None:
        db_div.department_id = div_in.department_id
    await db.commit()
    await db.refresh(db_div)
    return db_div

@router.delete("/divisions/{div_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role(["Admin"]))])
async def delete_division(div_id: int, db: AsyncSession = Depends(get_db)):
    db_div = await db.get(Division, div_id)
    if not db_div:
        raise HTTPException(status_code=404, detail="Division not found")
    await db.delete(db_div)
    await db.commit()
    return None

# --- Teams ---

@router.post("/teams", response_model=TeamResponse, dependencies=[Depends(require_role(["Admin"]))])
async def create_team(team_in: TeamCreate, db: AsyncSession = Depends(get_db)):
    db_team = Team(name=team_in.name, division_id=team_in.division_id)
    db.add(db_team)
    await db.commit()
    await db.refresh(db_team)
    return db_team

@router.patch("/teams/{team_id}", response_model=TeamResponse, dependencies=[Depends(require_role(["Admin"]))])
async def update_team(team_id: int, team_in: TeamUpdate, db: AsyncSession = Depends(get_db)):
    db_team = await db.get(Team, team_id)
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    if team_in.name is not None:
        db_team.name = team_in.name
    if team_in.division_id is not None:
        db_team.division_id = team_in.division_id
    await db.commit()
    await db.refresh(db_team)
    return db_team

@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role(["Admin"]))])
async def delete_team(team_id: int, db: AsyncSession = Depends(get_db)):
    db_team = await db.get(Team, team_id)
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    await db.delete(db_team)
    await db.commit()
    return None

# --- Employees (Jira Users) ---

@router.get("/employees", response_model=PaginatedResponse[JiraUserResponse])
async def get_employees(
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    size: int = 50,
    search: str = None
):
    """List Jira users (employees) with pagination and search."""
    skip = (page - 1) * size
    
    # Base query
    stmt = select(JiraUser)
    count_stmt = select(func.count()).select_from(JiraUser)
    
    # Apply search filter
    if search:
        search_filter = (JiraUser.display_name.ilike(f"%{search}%")) | (JiraUser.email.ilike(f"%{search}%"))
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)
    
    # Total count
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    # Items
    stmt = stmt.offset(skip).limit(size)
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

@router.patch("/employees/{employee_id}", response_model=JiraUserResponse, dependencies=[Depends(require_role(["Admin"]))])
async def update_employee(
    employee_id: int,
    emp_in: JiraUserUpdate,
    db: AsyncSession = Depends(get_db)
):
    db_emp = await db.get(JiraUser, employee_id)
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    if emp_in.team_id is not None:
        db_emp.team_id = emp_in.team_id if emp_in.team_id != 0 else None
    if emp_in.is_active is not None:
        db_emp.is_active = emp_in.is_active
        
    await db.commit()
    await db.refresh(db_emp)
    return db_emp
