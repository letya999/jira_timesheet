from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from core.database import get_db
from api import deps
from schemas.org import (
    DepartmentResponse, DepartmentCreate, DepartmentUpdate,
    DivisionResponse, DivisionCreate, DivisionUpdate,
    TeamResponse, TeamCreate, TeamUpdate
)
from schemas.user import JiraUserResponse, JiraUserUpdate
from schemas.pagination import PaginatedResponse
from models.user import JiraUser, User
from models.org import Department, Division, Team
from crud.org import department as crud_dept, division as crud_div, team as crud_team
import math

router = APIRouter()

# --- Employees (Jira Users) ---
@router.get("/employees", response_model=PaginatedResponse[JiraUserResponse])
async def get_employees(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.get_current_user),
    page: int = 1,
    size: int = 50,
    search: Optional[str] = None,
    team_id: Optional[int] = None
):
    """Fetch Jira users (employees) with pagination."""
    query = select(JiraUser).options(selectinload(JiraUser.user))
    if search:
        query = query.where(JiraUser.display_name.ilike(f"%{search}%"))
    if team_id:
        query = query.where(JiraUser.team_id == team_id)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Fetch items
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    pages = math.ceil(total / size) if size > 0 else 1
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.patch("/employees/{employee_id}", response_model=JiraUserResponse)
async def update_employee(
    employee_id: int,
    obj_in: JiraUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    result = await db.execute(select(JiraUser).where(JiraUser.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    await db.commit()
    await db.refresh(employee)
    return employee

# --- Departments ---
@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(db: AsyncSession = Depends(get_db)):
    return await crud_dept.get_multi(db)

@router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    obj_in: DepartmentCreate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO"]))
):
    dept = await crud_dept.create(db, obj_in=obj_in)
    result = await db.execute(
        select(Department)
        .where(Department.id == dept.id)
        .options(selectinload(Department.divisions).selectinload(Division.teams))
    )
    return result.scalar_one()

@router.patch("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: int,
    obj_in: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO"]))
):
    dept = await crud_dept.get(db, id=dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return await crud_dept.update(db, db_obj=dept, obj_in=obj_in)

@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    dept_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO"]))
):
    dept = await crud_dept.get(db, id=dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    await crud_dept.remove(db, id=dept_id)
    return None

# --- Divisions ---
@router.get("/divisions", response_model=List[DivisionResponse])
async def get_divisions(department_id: int = None, db: AsyncSession = Depends(get_db)):
    if department_id:
        return await crud_div.get_multi_by_department(db, department_id=department_id)
    return await crud_div.get_multi(db)

@router.post("/divisions", response_model=DivisionResponse)
async def create_division(
    obj_in: DivisionCreate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO"]))
):
    div = await crud_div.create(db, obj_in=obj_in)
    result = await db.execute(
        select(Division)
        .where(Division.id == div.id)
        .options(selectinload(Division.teams))
    )
    return result.scalar_one()

@router.patch("/divisions/{div_id}", response_model=DivisionResponse)
async def update_division(
    div_id: int,
    obj_in: DivisionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO"]))
):
    div = await crud_div.get(db, id=div_id)
    if not div:
        raise HTTPException(status_code=404, detail="Division not found")
    return await crud_div.update(db, db_obj=div, obj_in=obj_in)

@router.delete("/divisions/{div_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_division(
    div_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO"]))
):
    div = await crud_div.get(db, id=div_id)
    if not div:
        raise HTTPException(status_code=404, detail="Division not found")
    await crud_div.remove(db, id=div_id)
    return None

# --- Teams ---
@router.get("/teams", response_model=List[TeamResponse])
async def get_teams(division_id: int = None, db: AsyncSession = Depends(get_db)):
    if division_id:
        return await crud_team.get_multi_by_division(db, division_id=division_id)
    return await crud_team.get_multi(db)

@router.get("/my-teams", response_model=List[TeamResponse])
async def get_my_teams(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Fetch teams where current user is PM."""
    result = await db.execute(select(Team).where(Team.pm_id == current_user.id))
    return result.scalars().all()

@router.post("/teams", response_model=TeamResponse)
async def create_team(
    obj_in: TeamCreate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    team = await crud_team.create(db, obj_in=obj_in)
    return team

@router.patch("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    obj_in: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    team = await crud_team.get(db, id=team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team = await crud_team.update(db, db_obj=team, obj_in=obj_in)
    return team

@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    team = await crud_team.get(db, id=team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    await crud_team.remove(db, id=team_id)
    return None
