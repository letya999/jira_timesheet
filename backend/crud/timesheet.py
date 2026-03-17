from datetime import date
from typing import Any

from models.project import Issue
from models.timesheet import TimesheetPeriod, Worklog
from models.user import JiraUser
from schemas.timesheet import TimesheetPeriodBase  # Update schemas as needed
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from crud.base import CRUDBase


class CRUDWorklog(CRUDBase[Worklog, Any, Any]):
    async def get_multi_by_user_and_date(
        self, db: AsyncSession, *, user_id: int, start_date: date, end_date: date
    ) -> list[Worklog]:
        result = await db.execute(
            select(Worklog).where(
                and_(Worklog.jira_user_id == user_id, Worklog.date >= start_date, Worklog.date <= end_date)
            )
        )
        return result.scalars().all()

    async def get_multi_with_filters(
        self,
        db: AsyncSession,
        *,
        start_date: date | None = None,
        end_date: date | None = None,
        project_id: int | None = None,
        user_id: int | None = None,
        category: str | None = None,
        org_unit_id: int | None = None,
        org_unit_ids: list[int] | None = None,
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 50,
    ) -> (list[Worklog], int):
        query = select(Worklog).options(
            joinedload(Worklog.jira_user).joinedload(JiraUser.org_unit),
            joinedload(Worklog.issue).joinedload(Issue.project),
            joinedload(Worklog.category),
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

            query = query.join(WorklogCategory, Worklog.category_id == WorklogCategory.id).where(
                WorklogCategory.name == category
            )

        if org_unit_ids:
            query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).where(JiraUser.org_unit_id.in_(org_unit_ids))
        elif org_unit_id:
            query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).where(JiraUser.org_unit_id == org_unit_id)

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
    ) -> TimesheetPeriod | None:
        result = await db.execute(
            select(TimesheetPeriod).where(
                and_(
                    TimesheetPeriod.user_id == user_id,
                    TimesheetPeriod.start_date == start_date,
                    TimesheetPeriod.end_date == end_date,
                )
            )
        )
        return result.scalar_one_or_none()


timesheet_period = CRUDTimesheetPeriod(TimesheetPeriod)
