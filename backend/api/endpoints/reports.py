from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload
from core.database import get_db
from api import deps
from datetime import date
from schemas.reports import CustomReportRequest, CustomReportResponse
from models.timesheet import Worklog
from models.user import JiraUser
from models.project import Project, Issue, Release, Sprint
from models.org import OrgUnit, Role, UserOrgRole, ApprovalRoute
from models.category import WorklogCategory
from fastapi.responses import StreamingResponse
from io import BytesIO

router = APIRouter()

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(
    start_date: date,
    end_date: date,
    org_unit_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM", "Employee"]))
):
    """Returns aggregated data for PM/CEO dashboards."""
    # Stealth filter for regular users (Employee role)
    if current_user.role == "Employee":
        res = await db.execute(select(JiraUser).where(JiraUser.id == current_user.jira_user_id))
        jira_user = res.scalar_one_or_none()
        org_unit_id = jira_user.org_unit_id if jira_user and jira_user.org_unit_id else -1

    query = select(Worklog).options(
        joinedload(Worklog.jira_user).joinedload(JiraUser.org_unit).joinedload(OrgUnit.parent).joinedload(OrgUnit.parent),
        joinedload(Worklog.jira_user).joinedload(JiraUser.user),
        joinedload(Worklog.issue).joinedload(Issue.project),
        joinedload(Worklog.issue).selectinload(Issue.releases),
        joinedload(Worklog.issue).selectinload(Issue.sprints),
        joinedload(Worklog.category)
    ).where(
        Worklog.date >= start_date,
        Worklog.date <= end_date
    )

    if org_unit_id:
        query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).where(JiraUser.org_unit_id == org_unit_id)
    elif current_user.role == "PM":
        # PM can only see worklogs of users in their org units
        # Join UserOrgRole to find units where they have 'PM' or any role (for simplicity, we assume if they have a role, they can see it)
        query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).join(OrgUnit, JiraUser.org_unit_id == OrgUnit.id).join(UserOrgRole, UserOrgRole.org_unit_id == OrgUnit.id).where(UserOrgRole.user_id == current_user.id)

    result = await db.execute(query)
    worklogs = result.scalars().unique().all()

    report_data = []
    for w in worklogs:
        month_name = w.date.strftime("%B %Y")
        releases = ", ".join([r.name for r in w.issue.releases]) if w.issue and w.issue.releases else "N/A"

        user_id = w.jira_user.user.id if w.jira_user and w.jira_user.user else None

        unit_name = w.jira_user.org_unit.name if w.jira_user and w.jira_user.org_unit else "N/A"
        parent_name = w.jira_user.org_unit.parent.name if w.jira_user and w.jira_user.org_unit and w.jira_user.org_unit.parent else "N/A"

        item = {
            "Date": str(w.date),
            "Hours": w.hours,
            "Type": w.type,
            "User": w.jira_user.display_name if w.jira_user else "N/A",
            "User ID": user_id,
            "Project": w.issue.project.name if w.issue and w.issue.project else "N/A",
            "Task": w.issue.summary if w.issue else "N/A",
            "Issue Key": w.issue.key if w.issue else "N/A",
            "Releases": releases,
            "Category": w.category.name if w.category else "Jira Work",
            "Description": w.description or "",
            "OrgUnit": unit_name,
            "ParentUnit": parent_name,
            "Month": month_name
        }
        report_data.append(item)

    return {"data": report_data}

@router.get("/export")
async def export_report(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM", "Employee"]))
):
    """Generates Excel export for the given period."""
    data_resp = await get_dashboard_data(start_date, end_date, None, db, current_user)
    data = data_resp["data"]

    import pandas as pd
    df = pd.DataFrame(data)

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Dashboard Export')

    output.seek(0)

    headers = {
        'Content-Disposition': f'attachment; filename="timesheet_export_{start_date}_{end_date}.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_report_categories(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Returns all worklog categories for filtering."""
    result = await db.execute(select(WorklogCategory))
    categories = result.scalars().all()
    return [{"id": c.id, "name": c.name} for c in categories]

@router.get("/sprints", response_model=List[Dict[str, Any]])
async def get_report_sprints(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Returns all sprints for filtering."""
    result = await db.execute(select(Sprint).order_by(Sprint.start_date.desc()))
    sprints = result.scalars().all()
    return [{"id": s.id, "name": s.name} for s in sprints]

@router.post("/custom", response_model=Dict[str, Any])
async def get_custom_report(
    payload: CustomReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM", "Employee"]))
):
    """
    Returns a flat list of worklogs with joined user/project info for reporting.
    """
    if current_user.role == "Employee":
        # Regular employees can ONLY see their own worklogs
        payload.user_ids = [current_user.jira_user_id] if current_user.jira_user_id else [-1]
        # Disable other broad filters for employees
        payload.org_unit_id = None
        # They can still filter by project/category/type WITHIN their own logs
    elif current_user.role == "PM" and not payload.user_ids and not payload.org_unit_id:
        # PM case: default to only see users in their org units if no filter is set
        # Re-using dashboard logic
        res = await db.execute(
            select(OrgUnit.id).join(UserOrgRole).where(UserOrgRole.user_id == current_user.id)
        )
        my_unit_ids = [row[0] for row in res.all()]
        if my_unit_ids:
            # We filter query later by org_unit_id if it exists, 
            # but if it doesn't, we can add a custom filter for PM
            pass
        else:
            # If no units, default to only seeing themself
            payload.user_ids = [current_user.jira_user_id] if current_user.jira_user_id else [-1]

    query = select(Worklog).options(
        joinedload(Worklog.jira_user).joinedload(JiraUser.org_unit).joinedload(OrgUnit.parent),
        joinedload(Worklog.issue).joinedload(Issue.project),
        joinedload(Worklog.issue).selectinload(Issue.releases),
        joinedload(Worklog.issue).selectinload(Issue.sprints),
        joinedload(Worklog.category)
    ).where(
        Worklog.date >= payload.start_date,
        Worklog.date <= payload.end_date
    )

    if payload.project_id:
        query = query.join(Worklog.issue).where(Issue.project_id == payload.project_id)

    if hasattr(payload, 'org_unit_id') and payload.org_unit_id:
        query = query.join(Worklog.jira_user).where(JiraUser.org_unit_id == payload.org_unit_id)
    elif current_user.role == "PM" and not payload.user_ids:
        # If PM didn't pick a unit, but we have my_unit_ids
        res = await db.execute(
            select(OrgUnit.id).join(UserOrgRole).where(UserOrgRole.user_id == current_user.id)
        )
        my_unit_ids = [row[0] for row in res.all()]
        if my_unit_ids:
            query = query.join(Worklog.jira_user).where(JiraUser.org_unit_id.in_(my_unit_ids))

    if payload.user_ids:
        query = query.where(Worklog.jira_user_id.in_(payload.user_ids))

    if payload.sprint_ids:
        from models.project import issue_sprints
        query = query.join(Worklog.issue).join(issue_sprints).where(issue_sprints.c.sprint_id.in_(payload.sprint_ids))

    if payload.worklog_types:
        query = query.where(Worklog.type.in_(payload.worklog_types))

    if payload.category_ids:
        query = query.where(Worklog.category_id.in_(payload.category_ids))

    result = await db.execute(query)
    worklogs = result.scalars().unique().all()

    report_data = []
    for w in worklogs:
        h_val = w.hours
        if hasattr(payload, 'format') and payload.format == "days" and hasattr(payload, 'hours_per_day'):
            h_val = w.hours / payload.hours_per_day

        unit_name = w.jira_user.org_unit.name if w.jira_user and w.jira_user.org_unit else "N/A"
        parent_name = w.jira_user.org_unit.parent.name if w.jira_user and w.jira_user.org_unit and w.jira_user.org_unit.parent else "N/A"

        item = {
            "date": str(w.date),
            "hours": w.hours,
            "value": h_val,
            "type": w.type,
            "user": w.jira_user.display_name,
            "project": w.issue.project.name if w.issue and w.issue.project else "N/A",
            "task": w.issue.summary if w.issue else "N/A",
            "issue_key": w.issue.key if w.issue else "N/A",
            "release": ", ".join([r.name for r in w.issue.releases]) if w.issue and w.issue.releases else "N/A",
            "sprint": ", ".join([s.name for s in w.issue.sprints]) if w.issue and w.issue.sprints else "N/A",
            "category": w.category.name if w.category else "N/A",
            "description": w.description or "",
            "team": unit_name,
            "parent": parent_name
        }
        report_data.append(item)

    return {"data": report_data}
