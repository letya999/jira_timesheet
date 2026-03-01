from typing import List, Optional, Any
from datetime import date
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from crud.base import CRUDBase
from models.timesheet import Worklog, TimesheetPeriod
from schemas.timesheet import ManualLogCreate, TimesheetPeriodBase # Update schemas as needed

from sqlalchemy import select, and_, func, or_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from crud.base import CRUDBase
from models.timesheet import Worklog, TimesheetPeriod
from models.user import JiraUser
from models.org import OrgUnit, Role, UserOrgRole, ApprovalRoute
from models.project import Issue
from schemas.timesheet import ManualLogCreate, TimesheetPeriodBase

class CRUDWorklog(CRUDBase[Worklog, Any, Any]):
    async def get_multi_by_user_and_date(
        self, db: AsyncSession, *, user_id: int, start_date: date, end_date: date
    ) -> List[Worklog]:
        result = await db.execute(
            select(Worklog)
            .where(
                and_(
                    Worklog.jira_user_id == user_id,
                    Worklog.date >= start_date,
                    Worklog.date <= end_date
                )
            )
        )
        return result.scalars().all()

    async def get_multi_with_filters(
        self, db: AsyncSession, *, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        project_id: Optional[int] = None,
        user_id: Optional[int] = None,
        category: Optional[str] = None,
        dept_id: Optional[int] = None,
        div_id: Optional[int] = None,
        org_unit_id: Optional[int] = None,
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 50
    ) -> (List[Worklog], int):
        query = select(Worklog).options(
            joinedload(Worklog.jira_user).joinedload(JiraUser.org_unit),
            joinedload(Worklog.issue).joinedload(Issue.project),
            joinedload(Worklog.category)
        )
        
        # Apply filters
        if start_date:
            query = query.where(Worklog.date >= start_date)
        if end_date:
            query = query.where(Worklog.date <= end_date)
        if user_id is not None:
            query = query.where(Worklog.jira_user_id == user_id)
        if project_id:
            query = query.join(Issue, Worklog.issue_id == Issue.id).where(Issue.project_id == project_id)
        if category:
            from models.category import WorklogCategory
            query = query.join(WorklogCategory, Worklog.category_id == WorklogCategory.id).where(WorklogCategory.name == category)
            
        if org_unit_id:
            query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).where(JiraUser.org_unit_id == org_unit_id)
        elif div_id:
            query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).join(OrgUnit).where(OrgUnit.division_id == div_id)
        elif dept_id:
            query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).join(OrgUnit).join(Division).where(Division.department_id == dept_id)
            
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Sort by logging date (source_created_at for Jira, created_at for manual)
        logging_date = func.coalesce(Worklog.source_created_at, Worklog.created_at)
        if sort_order == "desc":
            query = query.order_by(logging_date.desc(), Worklog.id.desc())
        else:
            query = query.order_by(logging_date.asc(), Worklog.id.asc())
            
        # Pagination
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().unique().all(), total

worklog = CRUDWorklog(Worklog)

class CRUDTimesheetPeriod(CRUDBase[TimesheetPeriod, TimesheetPeriodBase, Any]):
    async def get_by_user_and_date(
        self, db: AsyncSession, *, user_id: int, start_date: date, end_date: date
    ) -> Optional[TimesheetPeriod]:
        result = await db.execute(
            select(TimesheetPeriod)
            .where(
                and_(
                    TimesheetPeriod.user_id == user_id,
                    TimesheetPeriod.start_date == start_date,
                    TimesheetPeriod.end_date == end_date
                )
            )
        )
        return result.scalar_one_or_none()

timesheet_period = CRUDTimesheetPeriod(TimesheetPeriod)
