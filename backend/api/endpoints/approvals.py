from datetime import date, datetime, timedelta

from core.database import get_db
from fastapi import APIRouter, Depends, HTTPException
from models.org import ApprovalRoute, UserOrgRole
from models.timesheet import TimesheetApprovalStep, TimesheetPeriod
from models.user import JiraUser, User
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user, require_role

router = APIRouter()

class PeriodSubmit(BaseModel):
    start_date: date
    end_date: date

class ApprovalAction(BaseModel):
    status: str
    comment: str | None = None

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
    target_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch period status for the current user and target date."""
    if not target_date:
        target_date = date.today()

    period_type = "weekly"
    from sqlalchemy.orm import joinedload
    result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(joinedload(User.jira_user).joinedload(JiraUser.org_unit))
    )
    user_with_team = result.scalar_one()

    if user_with_team.jira_user and user_with_team.jira_user.org_unit:
        period_type = user_with_team.jira_user.org_unit.reporting_period or "weekly"

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
            "user_id": current_user.id,
            "current_step_order": 1
        }

    return period

@router.post("/submit")
async def submit_period(
    payload: PeriodSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
            submitted_at=datetime.utcnow(),
            current_step_order=1
        )
        db.add(period)
    else:
        if period.status == "APPROVED":
            raise HTTPException(status_code=400, detail="Period already approved")
        period.status = "SUBMITTED"
        period.submitted_at = datetime.utcnow()
        period.current_step_order = 1

    await db.commit()
    await db.refresh(period)
    return period

@router.get("/team-periods")
async def get_team_periods(
    start_date: date,
    end_date: date,
    org_unit_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "CEO", "PM", "Employee"]))  # noqa: B008
):
    """Fetch all period statuses for a team in a specific date range."""
    user_query = select(User).join(JiraUser)

    if current_user.role in ["Admin", "CEO"]:
        if org_unit_id:
            user_query = user_query.where(JiraUser.org_unit_id == org_unit_id)
    else:
        # User only sees users in units where they have a role
        uor_res = await db.execute(select(UserOrgRole.org_unit_id).where(UserOrgRole.user_id == current_user.id))
        unit_ids = [row for row in uor_res.scalars().all()]
        if not unit_ids:
            return []

        if org_unit_id:
            if org_unit_id not in unit_ids:
                return []
            user_query = user_query.where(JiraUser.org_unit_id == org_unit_id)
        else:
            user_query = user_query.where(JiraUser.org_unit_id.in_(unit_ids))

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

async def _check_approval_permission(
    db: AsyncSession, user: User, period: TimesheetPeriod, org_unit_id: int | None
) -> bool:
    if user.role in ["Admin", "CEO"]:
        return True
    if not org_unit_id:
        return False

    stmt_routes = (
        select(ApprovalRoute)
        .where(
            and_(
                ApprovalRoute.org_unit_id == org_unit_id,
                ApprovalRoute.target_type == 'timesheet'
            )
        )
        .order_by(ApprovalRoute.step_order)
    )
    routes_res = await db.execute(stmt_routes)
    routes = routes_res.scalars().all()

    if routes:
        current_route = next((r for r in routes if r.step_order == period.current_step_order), None)
        if current_route:
            stmt_uor = (
                select(UserOrgRole)
                .where(
                    and_(
                        UserOrgRole.user_id == user.id,
                        UserOrgRole.org_unit_id == org_unit_id,
                        UserOrgRole.role_id == current_route.role_id
                    )
                )
            )
            uor_res = await db.execute(stmt_uor)
            return uor_res.scalar_one_or_none() is not None
    else:
        stmt_uor_simple = (
            select(UserOrgRole)
            .where(
                and_(
                    UserOrgRole.user_id == user.id,
                    UserOrgRole.org_unit_id == org_unit_id
                )
            )
        )
        uor_res = await db.execute(stmt_uor_simple)
        return uor_res.scalar_one_or_none() is not None
    return False

@router.post("/{period_id}/approve")
async def approve_period(
    period_id: int,
    action: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve or reject a submitted period with routing."""
    from sqlalchemy.orm import joinedload
    stmt = (
        select(TimesheetPeriod)
        .where(TimesheetPeriod.id == period_id)
        .options(joinedload(TimesheetPeriod.user).joinedload(User.jira_user))
    )
    result = await db.execute(stmt)
    period = result.scalar_one_or_none()

    if not period:
        raise HTTPException(status_code=404, detail="Period not found")
    if period.status != "SUBMITTED":
        raise HTTPException(status_code=400, detail="Only submitted periods can be processed")

    org_unit_id = period.user.jira_user.org_unit_id if period.user and period.user.jira_user else None
    if not await _check_approval_permission(db, current_user, period, org_unit_id):
        raise HTTPException(status_code=403, detail="Not authorized to approve this step")

    role_id_used = 1
    if org_unit_id:
        stmt_cr = (
            select(ApprovalRoute)
            .where(
                and_(
                    ApprovalRoute.org_unit_id == org_unit_id,
                    ApprovalRoute.target_type == 'timesheet',
                    ApprovalRoute.step_order == period.current_step_order
                )
            )
        )
        routes_res = await db.execute(stmt_cr)
        cr = routes_res.scalar_one_or_none()
        if cr:
            role_id_used = cr.role_id

    step = TimesheetApprovalStep(
        timesheet_period_id=period.id,
        step_order=period.current_step_order,
        role_id=role_id_used,
        status=action.status,
        approver_id=current_user.id,
        comment=action.comment,
        acted_at=datetime.utcnow()
    )
    db.add(step)

    if action.status == "REJECTED":
        period.status = "REJECTED"
    elif action.status == "APPROVED":
        if org_unit_id:
            stmt_routes_check = (
                select(ApprovalRoute)
                .where(
                    and_(
                        ApprovalRoute.org_unit_id == org_unit_id,
                        ApprovalRoute.target_type == 'timesheet'
                    )
                )
                .order_by(ApprovalRoute.step_order)
            )
            routes_res = await db.execute(stmt_routes_check)
            routes = routes_res.scalars().all()
            if routes and period.current_step_order < len(routes):
                period.current_step_order += 1
            else:
                period.status = "APPROVED"
        else:
            period.status = "APPROVED"

    period.comment = action.comment
    period.approved_at = datetime.utcnow()
    period.approved_by_id = current_user.id

    await db.commit()
    await db.refresh(period)
    return period
