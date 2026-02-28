from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from core.database import get_db
from api import deps
from models.timesheet import TimesheetPeriod
from models.user import User, JiraUser
from models.org import Team
from datetime import date, datetime, timedelta
from pydantic import BaseModel

router = APIRouter()

class PeriodSubmit(BaseModel):
    start_date: date
    end_date: date

class ApprovalAction(BaseModel):
    status: str
    comment: Optional[str] = None

def get_period_dates(ref_date: date, period_type: str):
    if period_type == "weekly":
        start_date = ref_date - timedelta(days=ref_date.weekday())
        end_date = start_date + timedelta(days=6)
    elif period_type == "monthly":
        start_date = ref_date.replace(day=1)
        import calendar
        _, last_day = calendar.monthrange(ref_date.year, ref_date.month)
        end_date = ref_date.replace(day=last_day)
    else: # bi-weekly
        if ref_date.day <= 15:
            start_date = ref_date.replace(day=1)
            end_date = ref_date.replace(day=15)
        else:
            start_date = ref_date.replace(day=16)
            import calendar
            _, last_day = calendar.monthrange(ref_date.year, ref_date.month)
            end_date = ref_date.replace(day=last_day)
    return start_date, end_date

@router.get("/my-period")
async def get_my_period(
    target_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Fetch period status for the current user and target date."""
    if not target_date:
        target_date = date.today()
        
    # Determine period type from user's team
    period_type = "weekly"
    # Need to load jira_user and team
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(joinedload(User.jira_user).joinedload(JiraUser.team))
    )
    user_with_team = result.scalar_one()
    
    if user_with_team.jira_user and user_with_team.jira_user.team:
        period_type = user_with_team.jira_user.team.reporting_period or "weekly"
    
    start_date, end_date = get_period_dates(target_date, period_type)
    
    result = await db.execute(
        select(TimesheetPeriod)
        .where(
            and_(
                TimesheetPeriod.user_id == current_user.id,
                TimesheetPeriod.start_date == start_date,
                TimesheetPeriod.end_date == end_date
            )
        )
    )
    period = result.scalar_one_or_none()
    
    if not period:
        return {
            "status": "OPEN",
            "start_date": start_date,
            "end_date": end_date,
            "user_id": current_user.id
        }
    
    return period

@router.post("/submit")
async def submit_period(
    payload: PeriodSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Submit a timesheet period for approval."""
    result = await db.execute(
        select(TimesheetPeriod)
        .where(
            and_(
                TimesheetPeriod.user_id == current_user.id,
                TimesheetPeriod.start_date == payload.start_date,
                TimesheetPeriod.end_date == payload.end_date
            )
        )
    )
    period = result.scalar_one_or_none()
    
    if not period:
        period = TimesheetPeriod(
            user_id=current_user.id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            status="SUBMITTED",
            submitted_at=datetime.now()
        )
        db.add(period)
    else:
        if period.status == "APPROVED":
            raise HTTPException(status_code=400, detail="Period already approved")
        period.status = "SUBMITTED"
        period.submitted_at = datetime.now()
    
    await db.commit()
    await db.refresh(period)
    return period

@router.get("/team-periods")
async def get_team_periods(
    start_date: date,
    end_date: date,
    team_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Fetch all period statuses for a team in a specific date range."""
    # Find all users we have access to
    user_query = select(User).join(JiraUser)
    
    if team_id:
        user_query = user_query.where(JiraUser.team_id == team_id)
    elif current_user.role == "PM":
        # PM can only see teams where they are PM
        user_query = user_query.join(Team, JiraUser.team_id == Team.id).where(Team.pm_id == current_user.id)
        
    result = await db.execute(user_query)
    team_users = result.scalars().all()
    user_ids = [u.id for u in team_users]
    
    if not user_ids:
        return []
        
    period_query = select(TimesheetPeriod).where(
        and_(
            TimesheetPeriod.user_id.in_(user_ids),
            TimesheetPeriod.start_date == start_date,
            TimesheetPeriod.end_date == end_date
        )
    )
    result = await db.execute(period_query)
    return result.scalars().all()

@router.post("/{period_id}/approve")
async def approve_period(
    period_id: int,
    action: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Approve or reject a submitted period."""
    result = await db.execute(select(TimesheetPeriod).where(TimesheetPeriod.id == period_id))
    period = result.scalar_one_or_none()
    
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")
        
    period.status = action.status
    period.comment = action.comment
    period.approved_at = datetime.now()
    period.approved_by_id = current_user.id
    
    await db.commit()
    await db.refresh(period)
    return period
