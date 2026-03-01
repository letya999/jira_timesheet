from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import joinedload
from core.database import get_db
from api import deps
from models import User, JiraUser, OrgUnit
from models.leave import LeaveRequest, LeaveType, LeaveStatus, LeaveApprovalStep
from models.org import ApprovalRoute, UserOrgRole
from schemas.leave import LeaveCreate, LeaveUpdate, LeaveResponse, TeamLeaveResponse
from services.notification import notification_service
from services.slack import slack_service
from datetime import date, datetime

router = APIRouter()

@router.post("/", response_model=LeaveResponse)
async def create_leave_request(
    payload: LeaveCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
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
                and_(LeaveRequest.start_date >= payload.start_date, LeaveRequest.end_date <= payload.end_date)
            )
        )
    )
    result = await db.execute(overlapping_query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="You already have a leave request overlapping these dates")

    result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .options(joinedload(User.jira_user).joinedload(JiraUser.org_unit))
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
        current_step_order=1
    )
    db.add(leave_request)
    await db.commit()
    await db.refresh(leave_request)

    # Determine approvers for step 1
    if org_unit_id:
        routes_res = await db.execute(select(ApprovalRoute).where(ApprovalRoute.org_unit_id == org_unit_id, ApprovalRoute.target_type == 'leave').order_by(ApprovalRoute.step_order))
        routes = routes_res.scalars().all()
        
        if routes:
            first_step = routes[0]
            # Find users with this role in this unit
            uor_res = await db.execute(select(UserOrgRole).where(UserOrgRole.org_unit_id == org_unit_id, UserOrgRole.role_id == first_step.role_id))
            uors = uor_res.scalars().all()
            for uor in uors:
                await notification_service.create_notification(
                    db,
                    user_id=uor.user_id,
                    sender_id=current_user.id,
                    title="🌴 New Leave Request",
                    message=f"**{current_user.full_name}** requested **{payload.type}** from **{payload.start_date}** to **{payload.end_date}**.",
                    type="leave_request_submitted",
                    related_entity_id=leave_request.id,
                    related_entity_type="LeaveRequest"
                )

        await db.commit() # Save notification

    return leave_request

@router.get("/my", response_model=List[LeaveResponse])
async def get_my_leave_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.user_id == current_user.id)
        .order_by(LeaveRequest.start_date.desc())
    )
    return result.scalars().all()

@router.get("/team", response_model=List[LeaveResponse])
async def get_team_leave_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_role(["Admin", "CEO", "PM", "Employee"]))
):
    """Fetch leave requests for units where the current user is an approver based on roles."""
    # Find all org_units where current user has ANY role that is involved in a leave ApprovalRoute
    # Or just fetch all leaves where current user is required for the *current* step.
    
    if current_user.role in ["Admin", "CEO"]:
        query = select(LeaveRequest).join(User, LeaveRequest.user_id == User.id)
    else:
        # Complex filtering: user has a role X in unit Y. ApprovalRoute for unit Y, target='leave', step=S requires role X.
        # So user can see leaves for unit Y. We'll simplify: PMs/Role holders see all requests for their units.
        uor_res = await db.execute(select(UserOrgRole.org_unit_id).where(UserOrgRole.user_id == current_user.id))
        unit_ids = [row for row in uor_res.scalars().all()]
        
        if not unit_ids:
            return []
            
        query = select(LeaveRequest).join(User, LeaveRequest.user_id == User.id).join(JiraUser, User.jira_user_id == JiraUser.id).where(JiraUser.org_unit_id.in_(unit_ids))

    result = await db.execute(
        query.options(joinedload(LeaveRequest.user))
        .order_by(LeaveRequest.start_date.desc())
    )
    leaves = result.scalars().all()

    for leaf in leaves:
        leaf.user_full_name = leaf.user.full_name

    return leaves

@router.get("/all", response_model=List[LeaveResponse])
async def get_all_leave_requests(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = select(LeaveRequest).join(User, LeaveRequest.user_id == User.id)

    if start_date:
        query = query.where(LeaveRequest.start_date >= start_date)
    if end_date:
        query = query.where(LeaveRequest.end_date <= end_date)

    result = await db.execute(
        query.options(joinedload(LeaveRequest.user))
        .order_by(LeaveRequest.start_date.desc())
    )
    leaves = result.scalars().all()

    for leaf in leaves:
        leaf.user_full_name = leaf.user.full_name

    return leaves

@router.patch("/{leave_id}", response_model=LeaveResponse)
async def update_leave_status(
    leave_id: int,
    payload: LeaveUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Approve or reject a leave request processing the approval routes."""
    result = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id).options(joinedload(LeaveRequest.user).joinedload(User.jira_user)))
    leave = result.scalar_one_or_none()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave.status != LeaveStatus.PENDING and current_user.role not in ["Admin", "CEO"]:
         raise HTTPException(status_code=400, detail="Only pending requests can be processed")

    if payload.type:
        leave.type = payload.type
    if payload.start_date:
        leave.start_date = payload.start_date
    if payload.end_date:
        leave.end_date = payload.end_date
    if payload.reason is not None:
        leave.reason = payload.reason

    # Verify if user can approve
    can_approve = False
    org_unit_id = leave.user.jira_user.org_unit_id if leave.user and leave.user.jira_user else None
    
    if current_user.role in ["Admin", "CEO"]:
        can_approve = True
        
    routes = []
    if org_unit_id and not can_approve:
        routes_res = await db.execute(select(ApprovalRoute).where(ApprovalRoute.org_unit_id == org_unit_id, ApprovalRoute.target_type == 'leave').order_by(ApprovalRoute.step_order))
        routes = routes_res.scalars().all()
        
        if routes:
            # find current route step
            current_route = next((r for r in routes if r.step_order == leave.current_step_order), None)
            if current_route:
                # check if current user has this role in this unit
                uor_res = await db.execute(select(UserOrgRole).where(UserOrgRole.user_id == current_user.id, UserOrgRole.org_unit_id == org_unit_id, UserOrgRole.role_id == current_route.role_id))
                if uor_res.scalar_one_or_none():
                    can_approve = True

    if not can_approve and not routes:
        # Fallback if no routes defined: let anyone with roles in unit approve? Or just reject?
        # Let's check if they have any role in the unit
        if org_unit_id:
            uor_res = await db.execute(select(UserOrgRole).where(UserOrgRole.user_id == current_user.id, UserOrgRole.org_unit_id == org_unit_id))
            if uor_res.scalar_one_or_none():
                can_approve = True
                
    if not can_approve:
        raise HTTPException(status_code=403, detail="Not authorized to approve this step")

    if payload.status:
        # Record the step
        # find current role_id
        role_id_used = None
        if org_unit_id:
            routes_res = await db.execute(select(ApprovalRoute).where(ApprovalRoute.org_unit_id == org_unit_id, ApprovalRoute.target_type == 'leave', ApprovalRoute.step_order == leave.current_step_order))
            cr = routes_res.scalar_one_or_none()
            if cr:
                role_id_used = cr.role_id

        # Create step record (dummy role_id 1 if fallback)
        step = LeaveApprovalStep(
            leave_request_id=leave.id,
            step_order=leave.current_step_order,
            role_id=role_id_used or 1,
            status=payload.status,
            approver_id=current_user.id,
            comment=payload.comment,
            acted_at=datetime.utcnow()
        )
        db.add(step)

        if payload.status == LeaveStatus.REJECTED:
            leave.status = LeaveStatus.REJECTED
        elif payload.status == LeaveStatus.APPROVED:
            # Check if more steps exist
            if org_unit_id:
                routes_res = await db.execute(select(ApprovalRoute).where(ApprovalRoute.org_unit_id == org_unit_id, ApprovalRoute.target_type == 'leave').order_by(ApprovalRoute.step_order))
                routes = routes_res.scalars().all()
                if routes and leave.current_step_order < len(routes):
                    leave.current_step_order += 1
                    # notify next approvers...
                    next_step = routes[leave.current_step_order - 1]
                    uor_res = await db.execute(select(UserOrgRole).where(UserOrgRole.org_unit_id == org_unit_id, UserOrgRole.role_id == next_step.role_id))
                    uors = uor_res.scalars().all()
                    for uor in uors:
                        await notification_service.create_notification(
                            db,
                            user_id=uor.user_id,
                            sender_id=current_user.id,
                            title="🌴 Leave Request Pending Your Approval",
                            message=f"**{leave.user.full_name}**'s request has reached step {leave.current_step_order} and requires your approval.",
                            type="leave_request_submitted",
                            related_entity_id=leave.id,
                            related_entity_type="LeaveRequest"
                        )
                else:
                    leave.status = LeaveStatus.APPROVED
            else:
                leave.status = LeaveStatus.APPROVED

    leave.approver_id = current_user.id # save last approver for legacy
    if payload.comment is not None:
        leave.comment = payload.comment


    await db.commit()
    await db.refresh(leave)

    if leave.status in [LeaveStatus.APPROVED, LeaveStatus.REJECTED]:
        status_icon = "✅" if leave.status == LeaveStatus.APPROVED else "❌"
        await notification_service.create_notification(
            db,
            user_id=leave.user_id,
            sender_id=current_user.id,
            title=f"{status_icon} Leave Request {leave.status}",
            message=f"Your **{leave.type}** request has been **{leave.status.lower()}**.",
            type=f"leave_request_{leave.status.lower()}",
            related_entity_id=leave.id,
            related_entity_type="LeaveRequest"
        )
        await db.commit()

    return leave
