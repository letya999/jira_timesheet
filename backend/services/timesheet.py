from datetime import date
from typing import Any

from core.audit import log_audit
from core.config import settings
from crud.timesheet import timesheet_period as crud_timesheet_period
from fastapi import HTTPException, Request, status
from models.project import Issue
from models.timesheet import TimesheetPeriod, Worklog
from models.user import JiraUser, User
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.calendar import calendar_service
from services.notification import notification_service


class TimesheetService:
    async def get_user_worklogs(
        self, db: AsyncSession, *, user_id: int, start_date: date, end_date: date
    ) -> list[dict[str, Any]]:
        from sqlalchemy.orm import joinedload

        result = await db.execute(
            select(Worklog)
            .where(and_(Worklog.jira_user_id == user_id, Worklog.date >= start_date, Worklog.date <= end_date))
            .options(
                joinedload(Worklog.category),
                joinedload(Worklog.issue).joinedload(Issue.project),
                joinedload(Worklog.jira_user).joinedload(JiraUser.org_unit),
            )
        )
        items = result.scalars().all()

        resp_items = []
        for item in items:
            resp_items.append(
                {
                    "id": item.id,
                    "date": item.date,
                    "hours": item.hours,
                    "description": item.description,
                    "type": item.type,
                    "status": item.status,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at,
                    "source_created_at": item.source_created_at,
                    "category_id": item.category_id,
                    "user_id": item.jira_user_id,
                    "user_name": item.jira_user.display_name if item.jira_user else "Unknown",
                    "jira_account_id": item.jira_user.jira_account_id if item.jira_user else None,
                    "project_name": item.issue.project.name if item.issue and item.issue.project else "N/A",
                    "issue_key": item.issue.key if item.issue else "N/A",
                    "issue_summary": item.issue.summary if item.issue else None,
                    "category": item.category.name if item.category else "Other",
                    "category_name": item.category.name if item.category else "Other",
                    "team_name": item.jira_user.org_unit.name if item.jira_user and item.jira_user.org_unit else "N/A",
                }
            )
        return resp_items

    async def submit_period(
        self, db: AsyncSession, *, user_id: int, start_date: date, end_date: date, request: Request | None = None
    ) -> TimesheetPeriod:
        # Check if period already exists
        db_period = await crud_timesheet_period.get_by_user_and_date(
            db, user_id=user_id, start_date=start_date, end_date=end_date
        )

        if db_period:
            if db_period.status in ["SUBMITTED", "APPROVED"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail=f"Period already {db_period.status.lower()}"
                )

            # Update existing period to SUBMITTED
            db_period = await crud_timesheet_period.update(
                db, db_obj=db_period, obj_in={"status": "SUBMITTED", "submitted_at": date.today()}
            )
        else:
            # Create new period
            from schemas.timesheet import TimesheetPeriodBase

            period_in = TimesheetPeriodBase(
                user_id=user_id, start_date=start_date, end_date=end_date, status="SUBMITTED"
            )
            db_period = await crud_timesheet_period.create(db, obj_in=period_in)

        # Load user info for notification
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one()

        # Send Notification
        await notification_service.notify_timesheet_submitted(
            db,
            user_id=user_id,
            timesheet_id=db_period.id,
            user_name=user.full_name,
            period_label=f"{start_date} - {end_date}",
        )

        await log_audit(
            db,
            action="SUBMIT_TIMESHEET",
            target_type="TimesheetPeriod",
            target_id=str(db_period.id),
            user_id=user_id,
            request=request,
        )

        await db.commit()
        return db_period

    async def approve_period(
        self,
        db: AsyncSession,
        *,
        period_id: int,
        approver_id: int,
        status: str,  # APPROVED or REJECTED
        comment: str | None = None,
        request: Request | None = None,
    ) -> TimesheetPeriod:
        db_period = await crud_timesheet_period.get(db, id=period_id)
        if not db_period:
            raise HTTPException(status_code=404, detail="Timesheet period not found")

        update_data = {"status": status, "approved_by_id": approver_id, "comment": comment}

        if status == "APPROVED":
            from datetime import datetime

            update_data["approved_at"] = datetime.now()

        db_period = await crud_timesheet_period.update(db, db_obj=db_period, obj_in=update_data)

        # Send Notification to the timesheet owner
        await notification_service.notify_timesheet_status_change(
            db,
            user_id=db_period.user_id,
            approver_id=approver_id,
            timesheet_id=db_period.id,
            status=status,
            period_label=f"{db_period.start_date} - {db_period.end_date}",
            comment=comment,
        )

        await log_audit(
            db,
            action=f"{status}_TIMESHEET",
            target_type="TimesheetPeriod",
            target_id=str(db_period.id),
            user_id=approver_id,
            payload={"comment": comment},
            request=request,
        )

        await db.commit()
        return db_period

    async def get_period_summary(self, db: AsyncSession, period: TimesheetPeriod) -> dict[str, Any]:
        """Calculate summary info for a period including expected working hours."""
        working_days = await calendar_service.get_working_days_count(db, period.start_date, period.end_date)
        expected_hours = working_days * settings.DEFAULT_HOURS_PER_DAY

        # Get actual hours
        result = await db.execute(
            select(func.sum(Worklog.hours)).where(
                Worklog.jira_user_id == period.user_id,
                Worklog.date >= period.start_date,
                Worklog.date <= period.end_date,
            )
        )
        total_hours = result.scalar() or 0.0

        return {"working_days": working_days, "expected_hours": expected_hours, "total_hours": float(total_hours)}


timesheet_service = TimesheetService()
