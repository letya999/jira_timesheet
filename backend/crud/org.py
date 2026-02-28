from typing import List, Optional, Any
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from crud.base import CRUDBase
from models.org import Department, Division, Team
from schemas.org import DepartmentCreate, DepartmentUpdate, DivisionCreate, DivisionUpdate, TeamCreate, TeamUpdate

class CRUDDepartment(CRUDBase[Department, DepartmentCreate, DepartmentUpdate]):
    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[Department]:
        result = await db.execute(
            select(Department)
            .options(
                selectinload(Department.divisions).selectinload(Division.teams)
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_name(self, db: AsyncSession, *, name: str) -> Optional[Department]:
        result = await db.execute(select(Department).where(Department.name == name))
        return result.scalar_one_or_none()

department = CRUDDepartment(Department)

class CRUDDivision(CRUDBase[Division, DivisionCreate, DivisionUpdate]):
    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[Division]:
        result = await db.execute(
            select(Division)
            .options(selectinload(Division.teams))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_multi_by_department(
        self, db: AsyncSession, *, department_id: int
    ) -> List[Division]:
        result = await db.execute(
            select(Division)
            .where(Division.department_id == department_id)
            .options(selectinload(Division.teams))
        )
        return result.scalars().all()

division = CRUDDivision(Division)

class CRUDTeam(CRUDBase[Team, TeamCreate, TeamUpdate]):
    async def get_multi_by_division(
        self, db: AsyncSession, *, division_id: int
    ) -> List[Team]:
        result = await db.execute(select(Team).where(Team.division_id == division_id))
        return result.scalars().all()
    
    async def get_by_pm(self, db: AsyncSession, *, pm_id: int) -> List[Team]:
        result = await db.execute(select(Team).where(Team.pm_id == pm_id))
        return result.scalars().all()

team = CRUDTeam(Team)
