from datetime import date, datetime

from core.database import get_db
from fastapi import APIRouter, Depends, HTTPException
from models import JiraUser, User
from models.leave import LeaveApprovalStep, LeaveRequest, LeaveStatus
from models.org import ApprovalRoute, UserOrgRole
from schemas.leave import LeaveCreate, LeaveResponse, LeaveUpdate
from services.notification import notification_service
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from api.deps import get_current_user, require_role

router = APIRouter()


async def _get_leave_approval_permission(
    db: AsyncSession, user: User, leave: LeaveRequest, org_unit_id: int | None
) -> bool:
    if user.role in ["Admin", "CEO"]:
        return True
    if not org_unit_id:
        return False

    stmt_routes = (
        select(ApprovalRoute)
        .where(and_(ApprovalRoute.org_unit_id == org_unit_id, ApprovalRoute.target_type == "leave"))
        .order_by(ApprovalRoute.step_order)
    )
    routes_res = await db.execute(stmt_routes)
    routes = routes_res.scalars().all()

    if routes:
        current_route = next((r for r in routes if r.step_order == leave.current_step_order), None)
        if current_route:
            stmt_uor = select(UserOrgRole).where(
                and_(
                    UserOrgRole.user_id == user.id,
                    UserOrgRole.org_unit_id == org_unit_id,
                    UserOrgRole.role_id == current_route.role_id,
                )
            )
            uor_res = await db.execute(stmt_uor)
            return uor_res.scalar_one_or_none() is not None
    else:
        stmt_uor_fallback = select(UserOrgRole).where(
            and_(UserOrgRole.user_id == user.id, UserOrgRole.org_unit_id == org_unit_id)
        )
        uor_res = await db.execute(stmt_uor_fallback)
        return uor_res.scalar_one_or_none() is not None
    return False


async def _notify_next_leave_approvers(db: AsyncSession, leave: LeaveRequest, org_unit_id: int, current_user: User):
    stmt_routes = (
        select(ApprovalRoute)
        .where(and_(ApprovalRoute.org_unit_id == org_unit_id, ApprovalRoute.target_type == "leave"))
        .order_by(ApprovalRoute.step_order)
    )
    routes_res = await db.execute(stmt_routes)
    routes = routes_res.scalars().all()

    if routes and leave.current_step_order < len(routes):
        leave.current_step_order += 1
        next_step = routes[leave.current_step_order - 1]
        stmt_next_uor = select(UserOrgRole).where(
            and_(UserOrgRole.org_unit_id == org_unit_id, UserOrgRole.role_id == next_step.role_id)
        )
        uor_res = await db.execute(stmt_next_uor)
        uors = uor_res.scalars().all()
        for uor in uors:
            msg = (
                f"**{leave.user.full_name}**'s request has reached step "
                f"{leave.current_step_order} and requires your approval."
            )
            await notification_service.create_notification(
                db,
                user_id=uor.user_id,
                sender_id=current_user.id,
                title="🌴 Leave Request Pending Your Approval",
                message=msg,
                type="leave_request_submitted",
                related_entity_id=leave.id,
                related_entity_type="LeaveRequest",
            )
    else:
        leave.status = LeaveStatus.APPROVED


async def _get_current_role_id(db: AsyncSession, org_unit_id: int | None, step_order: int) -> int:
    if not org_unit_id:
        return 1
    stmt = select(ApprovalRoute).where(
        and_(
            ApprovalRoute.org_unit_id == org_unit_id,
            ApprovalRoute.target_type == "leave",
            ApprovalRoute.step_order == step_order,
        )
    )
    res = await db.execute(stmt)
    cr = res.scalar_one_or_none()
    return cr.role_id if cr else 1


@router.post("/", response_model=LeaveResponse)
async def create_leave_request(
    payload: LeaveCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Create a new leave request and notify the first step managers."""
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date")

    overlapping_query = select(LeaveRequest).where(
        and_(
            LeaveRequest.user_id == current_user.id,
            LeaveRequest.status != LeaveStatus.CANCELLED,
            or_(
                and_(LeaveRequest.start_date <= payload.start_date, LeaveRequest.end_date >= payload.start_date),
                and_(LeaveRequest.start_date <= payload.end_date, LeaveRequest.end_date >= payload.end_date),
                and_(LeaveRequest.start_date >= payload.start_date, LeaveRequest.end_date <= payload.end_date),
            ),
        )
    )
    result = await db.execute(overlapping_query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="You already have a leave request overlapping these dates")

    result = await db.execute(
        select(User).where(User.id == current_user.id).options(joinedload(User.jira_user).joinedload(JiraUser.org_unit))
    )
    user_with_team = result.scalar_one()

    org_unit_id = None
    if user_with_team.jira_user and user_with_team.jira_user.org_unit:
        org_unit_id = user_with_team.jira_user.org_unit.id

    leave_request = LeaveRequest(
        user_id=current_user.id,
        type=payload.type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status=LeaveStatus.PENDING,
        current_step_order=1,
    )
    db.add(leave_request)
    await db.commit()
    await db.refresh(leave_request)

    # Determine approvers for step 1
    if org_unit_id:
        stmt_routes = (
            select(ApprovalRoute)
            .where(and_(ApprovalRoute.org_unit_id == org_unit_id, ApprovalRoute.target_type == "leave"))
            .order_by(ApprovalRoute.step_order)
        )
        routes_res = await db.execute(stmt_routes)
        routes = routes_res.scalars().all()

        if routes:
            first_step = routes[0]
            # Find users with this role in this unit
            stmt_uors = select(UserOrgRole).where(
                and_(UserOrgRole.org_unit_id == org_unit_id, UserOrgRole.role_id == first_step.role_id)
            )
            uor_res = await db.execute(stmt_uors)
            uors = uor_res.scalars().all()
            for uor in uors:
                msg = (
                    f"**{current_user.full_name}** requested **{payload.type}** "
                    f"from **{payload.start_date}** to **{payload.end_date}**."
                )
                await notification_service.create_notification(
                    db,
                    user_id=uor.user_id,
                    sender_id=current_user.id,
                    title="🌴 New Leave Request",
                    message=msg,
                    type="leave_request_submitted",
                    related_entity_id=leave_request.id,
                    related_entity_type="LeaveRequest",
                )

        await db.commit()  # Save notification

    return leave_request


@router.get("/my", response_model=list[LeaveResponse])
async def get_my_leave_requests(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(LeaveRequest).where(LeaveRequest.user_id == current_user.id).order_by(LeaveRequest.start_date.desc())
    )
    return result.scalars().all()


@router.get("/team", response_model=list[LeaveResponse])
async def get_team_leave_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "CEO", "PM", "Employee"])),  # noqa: B008
):
    """Fetch leave requests for units where the current user is an approver based on roles."""
    if current_user.role in ["Admin", "CEO"]:
        query = select(LeaveRequest).join(User, LeaveRequest.user_id == User.id)
    else:
        # Complex filtering: user has a role X in unit Y.
        # We'll simplify: PMs/Role holders see all requests for their units.
        uor_res = await db.execute(select(UserOrgRole.org_unit_id).where(UserOrgRole.user_id == current_user.id))
        unit_ids = [row for row in uor_res.scalars().all()]

        if not unit_ids:
            return []

        query = (
            select(LeaveRequest)
            .join(User, LeaveRequest.user_id == User.id)
            .join(JiraUser, User.jira_user_id == JiraUser.id)
            .where(JiraUser.org_unit_id.in_(unit_ids))
        )

    result = await db.execute(
        query.options(joinedload(LeaveRequest.user).joinedload(User.jira_user))
        .order_by(LeaveRequest.start_date.desc())
    )
    leaves = result.scalars().all()

    for leaf in leaves:
        leaf.user_full_name = leaf.user.full_name
        if leaf.user.jira_user:
            leaf.user_avatar_url = leaf.user.jira_user.avatar_url

    return leaves


@router.get("/all", response_model=list[LeaveResponse])
async def get_all_leave_requests(
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(LeaveRequest).join(User, LeaveRequest.user_id == User.id)

    if start_date:
        query = query.where(LeaveRequest.start_date >= start_date)
    if end_date:
        query = query.where(LeaveRequest.end_date <= end_date)

    result = await db.execute(
        query.options(joinedload(LeaveRequest.user).joinedload(User.jira_user))
        .order_by(LeaveRequest.start_date.desc())
    )
    leaves = result.scalars().all()

    for leaf in leaves:
        leaf.user_full_name = leaf.user.full_name
        if leaf.user.jira_user:
            leaf.user_avatar_url = leaf.user.jira_user.avatar_url

    return leaves


@router.patch("/{leave_id}", response_model=LeaveResponse)
async def update_leave_status(
    leave_id: int,
    payload: LeaveUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a leave request processing the approval routes."""
    stmt = (
        select(LeaveRequest)
        .where(LeaveRequest.id == leave_id)
        .options(joinedload(LeaveRequest.user).joinedload(User.jira_user))
    )
    result = await db.execute(stmt)
    leave = result.scalar_one_or_none()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if leave.status != LeaveStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending requests can be updated")

    org_unit_id = leave.user.jira_user.org_unit_id if leave.user and leave.user.jira_user else None
    if not await _get_leave_approval_permission(db, current_user, leave, org_unit_id):
        raise HTTPException(status_code=403, detail="Not authorized to approve this step")

    if payload.status:
        role_id_used = await _get_current_role_id(db, org_unit_id, leave.current_step_order)

        step = LeaveApprovalStep(
            leave_request_id=leave.id,
            step_order=leave.current_step_order,
            role_id=role_id_used,
            status=payload.status,
            approver_id=current_user.id,
            comment=payload.comment,
            acted_at=datetime.utcnow(),
        )
        db.add(step)

        leave.comment = payload.comment
        leave.approver_id = current_user.id

        if payload.status == LeaveStatus.REJECTED:
            leave.status = LeaveStatus.REJECTED
        elif payload.status == LeaveStatus.APPROVED:
            if org_unit_id:
                await _notify_next_leave_approvers(db, leave, org_unit_id, current_user)
            else:
                leave.status = LeaveStatus.APPROVED

        # Notify user
        await notification_service.create_notification(
            db,
            user_id=leave.user_id,
            sender_id=current_user.id,
            title=f"🌴 Leave Request Update: {leave.status}",
            message=f"Your request has been **{leave.status.lower()}**.",
            type=f"leave_request_{leave.status.lower()}",
            related_entity_id=leave.id,
            related_entity_type="LeaveRequest",
        )
        await db.commit()
        await db.refresh(leave)
        if leave.user:
            leave.user_full_name = leave.user.full_name

    return leave
