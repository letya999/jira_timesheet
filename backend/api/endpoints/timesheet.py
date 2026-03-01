from typing import List, Optional, Dict, Any
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from core.database import get_db
from api import deps
from schemas.timesheet import WorklogResponse, TimesheetPeriodResponse, TimesheetSubmitRequest, TimesheetApprovalRequest, ManualLogCreate
from schemas.pagination import PaginatedResponse
from services.timesheet import timesheet_service
from crud.timesheet import worklog as crud_worklog
from models.user import User, JiraUser
from models.project import Issue
from models.category import WorklogCategory
from models.timesheet import Worklog, TimesheetPeriod
import math

router = APIRouter()

async def _to_period_response(db: AsyncSession, period: TimesheetPeriod) -> Dict[str, Any]:
    """Helper to convert TimesheetPeriod model to response with summary info."""
    summary = await timesheet_service.get_period_summary(db, period)
    return {
        "id": period.id,
        "user_id": period.user_id,
        "start_date": period.start_date,
        "end_date": period.end_date,
        "status": period.status,
        "submitted_at": period.submitted_at,
        "approved_at": period.approved_at,
        "approved_by_id": period.approved_by_id,
        "comment": period.comment,
        "created_at": period.created_at,
        "updated_at": period.updated_at,
        "total_hours": summary["total_hours"],
        "expected_hours": summary["expected_hours"],
        "working_days": summary["working_days"]
    }

@router.get("/", response_model=PaginatedResponse[WorklogResponse])
async def get_all_worklogs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    category: Optional[str] = None,
    dept_id: Optional[int] = None,
    div_id: Optional[int] = None,
    org_unit_id: Optional[int] = None,
    sort_order: str = "desc",
    page: int = 1,
    size: int = 50
):
    """Get all worklogs with advanced filtering and pagination."""
    # Logic for filtering based on roles and provided parameters
    if current_user.role == "Employee":
        # Regular users can only see their own logs
        user_id = current_user.jira_user_id
    elif current_user.role in ["Admin", "CEO"]:
        # Admins and CEOs see all logs by default if no filters are provided
        pass
    else:
        # For PM (or others):
        # If no specific filters (user, team, dept, div) are provided, 
        # default to showing ONLY their own worklogs.
        if user_id is None and org_unit_id is None and dept_id is None and div_id is None:
            user_id = current_user.jira_user_id if current_user.jira_user_id is not None else -1
        
        # Note: If they provide org_unit_id, the crud will filter by that team.
        # If they provide user_id, it will filter by that user.

    skip = (page - 1) * size
    items, total = await crud_worklog.get_multi_with_filters(
        db,
        start_date=start_date,
        end_date=end_date,
        user_id=user_id,
        project_id=project_id,
        category=category,
        dept_id=dept_id,
        div_id=div_id,
        org_unit_id=org_unit_id,
        sort_order=sort_order,
        skip=skip,
        limit=size
    )
    pages = math.ceil(total / size) if size > 0 else 1
    
    # Map to response schema
    resp_items = []
    for item in items:
        resp_items.append({
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
            "team_name": item.jira_user.org_unit.name if item.jira_user and item.jira_user.org_unit else "N/A"
        })
        
    return {
        "items": resp_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.post("/manual", response_model=WorklogResponse)
async def create_manual_log(
    payload: ManualLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_role(["Admin", "CEO", "PM", "Employee"]))
):
    """Create a manual worklog entry."""
    # Find WorklogCategory by name
    res = await db.execute(select(WorklogCategory).where(WorklogCategory.name == payload.category))
    cat = res.scalar_one_or_none()
    
    if not cat:
        cat = WorklogCategory(name=payload.category)
        db.add(cat)
        await db.commit()
        await db.refresh(cat)
        
    db_log = Worklog(
        date=payload.date,
        hours=payload.hours,
        category_id=cat.id,
        description=payload.description,
        type="MANUAL",
        jira_user_id=payload.user_id if payload.user_id else current_user.jira_user_id,
        issue_id=payload.issue_id,
        status="APPROVED" 
    )
    db.add(db_log)
    await db.commit()
    await db.refresh(db_log)
    
    # Re-fetch with joined info for response
    result = await db.execute(
        select(Worklog)
        .where(Worklog.id == db_log.id)
        .options(
            joinedload(Worklog.jira_user).joinedload(JiraUser.org_unit),
            joinedload(Worklog.issue).joinedload(Issue.project),
            joinedload(Worklog.category)
        )
    )
    item = result.scalar_one()
    
    return {
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
        "team_name": item.jira_user.org_unit.name if item.jira_user and item.jira_user.org_unit else "N/A"
    }

@router.get("/worklogs", response_model=List[WorklogResponse])
async def get_my_worklogs(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get current user's worklogs for a period."""
    if not current_user.jira_user_id:
        return []
    return await timesheet_service.get_user_worklogs(
        db, user_id=current_user.jira_user_id, start_date=start_date, end_date=end_date
    )

@router.post("/submit", response_model=TimesheetPeriodResponse)
async def submit_timesheet(
    payload: TimesheetSubmitRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Submit timesheet for approval."""
    period = await timesheet_service.submit_period(
        db, 
        user_id=current_user.id, 
        start_date=payload.start_date, 
        end_date=payload.end_date,
        request=request
    )
    return await _to_period_response(db, period)

@router.post("/approve/{period_id}", response_model=TimesheetPeriodResponse)
async def approve_timesheet(
    period_id: int,
    payload: TimesheetApprovalRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Approve or reject a timesheet period."""
    period = await timesheet_service.approve_period(
        db,
        period_id=period_id,
        approver_id=current_user.id,
        status=payload.status,
        comment=payload.comment,
        request=request
    )
    return await _to_period_response(db, period)
