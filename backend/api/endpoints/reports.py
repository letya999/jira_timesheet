from datetime import date
from io import BytesIO
from typing import Any

from core.database import get_db
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from models.category import WorklogCategory
from models.org import OrgUnit, UserOrgRole
from models.project import Issue, Sprint
from models.timesheet import Worklog
from models.user import JiraUser, User
from schemas.reports import CustomReportRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from api.deps import get_current_user, require_role

router = APIRouter()


@router.get("/dashboard", response_model=dict[str, Any])
async def get_dashboard_data(
    start_date: date,
    end_date: date,
    org_unit_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["Admin", "CEO", "PM", "Employee"])),  # noqa: B008
):
    """Returns aggregated data for PM/CEO dashboards."""
    # Stealth filter for regular users (Employee role)
    if current_user.role == "Employee":
        res = await db.execute(select(JiraUser).where(JiraUser.id == current_user.jira_user_id))
        jira_user = res.scalar_one_or_none()
        org_unit_id = jira_user.org_unit_id if jira_user and jira_user.org_unit_id else -1

    query = (
        select(Worklog)
        .options(
            joinedload(Worklog.jira_user).joinedload(JiraUser.org_unit).joinedload(OrgUnit.parent),
            joinedload(Worklog.jira_user).joinedload(JiraUser.user),
            joinedload(Worklog.issue).joinedload(Issue.project),
            joinedload(Worklog.issue).selectinload(Issue.releases),
            joinedload(Worklog.issue).selectinload(Issue.sprints),
            joinedload(Worklog.category),
        )
        .where(Worklog.date >= start_date, Worklog.date <= end_date)
    )

    if org_unit_id:
        query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).where(JiraUser.org_unit_id == org_unit_id)
    elif current_user.role == "PM":
        query = (
            query.join(JiraUser, Worklog.jira_user_id == JiraUser.id)
            .join(OrgUnit, JiraUser.org_unit_id == OrgUnit.id)
            .join(UserOrgRole, UserOrgRole.org_unit_id == OrgUnit.id)
            .where(UserOrgRole.user_id == current_user.id)
        )

    result = await db.execute(query)
    worklogs = result.scalars().unique().all()

    report_data = []
    for w in worklogs:
        month_name = w.date.strftime("%B %Y")
        releases = ", ".join([r.name for r in w.issue.releases]) if w.issue and w.issue.releases else "N/A"
        user_id = w.jira_user.user.id if w.jira_user and w.jira_user.user else None
        unit_name = w.jira_user.org_unit.name if w.jira_user and w.jira_user.org_unit else "N/A"

        parent_name = "N/A"
        if w.jira_user and w.jira_user.org_unit and w.jira_user.org_unit.parent:
            parent_name = w.jira_user.org_unit.parent.name

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
            "Month": month_name,
        }
        report_data.append(item)

    return {"data": report_data}


@router.get("/export")
async def export_report(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["Admin", "CEO", "PM", "Employee"])),  # noqa: B008
):
    """Generates Excel export for the given period."""
    data_resp = await get_dashboard_data(start_date, end_date, None, db, current_user)
    data = data_resp["data"]

    import pandas as pd

    df = pd.DataFrame(data)

    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Dashboard Export")

    output.seek(0)

    headers = {"Content-Disposition": (f'attachment; filename="timesheet_export_{start_date}_{end_date}.xlsx"')}
    return StreamingResponse(
        output, headers=headers, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/categories", response_model=list[dict[str, Any]])
async def get_report_categories(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """Returns all worklog categories for filtering."""
    result = await db.execute(select(WorklogCategory))
    categories = result.scalars().all()
    return [{"id": c.id, "name": c.name} for c in categories]


@router.get("/sprints", response_model=list[dict[str, Any]])
async def get_report_sprints(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """Returns all sprints for filtering."""
    result = await db.execute(select(Sprint).order_by(Sprint.start_date.desc()))
    sprints = result.scalars().all()
    return [{"id": s.id, "name": s.name} for s in sprints]


async def _apply_custom_filters(query, payload: CustomReportRequest, current_user: User, db: AsyncSession):
    """Applies complex filters for custom reports based on roles and payload."""
    if current_user.role == "Employee":
        payload.user_ids = [current_user.jira_user_id] if current_user.jira_user_id else [-1]
        payload.org_unit_id = None
    elif current_user.role == "PM" and not payload.user_ids and not payload.org_unit_id:
        res = await db.execute(select(OrgUnit.id).join(UserOrgRole).where(UserOrgRole.user_id == current_user.id))
        my_unit_ids = [row[0] for row in res.all()]
        if not my_unit_ids:
            payload.user_ids = [current_user.jira_user_id] if current_user.jira_user_id else [-1]
        else:
            query = query.join(Worklog.jira_user).where(JiraUser.org_unit_id.in_(my_unit_ids))

    if payload.project_id:
        query = query.join(Worklog.issue).where(Issue.project_id == payload.project_id)
    if hasattr(payload, "org_unit_id") and payload.org_unit_id:
        query = query.join(Worklog.jira_user).where(JiraUser.org_unit_id == payload.org_unit_id)
    if payload.user_ids:
        query = query.where(Worklog.jira_user_id.in_(payload.user_ids))
    if payload.sprint_ids:
        from models.project import issue_sprints

        query = query.join(Worklog.issue).join(issue_sprints).where(issue_sprints.c.sprint_id.in_(payload.sprint_ids))
    if payload.worklog_types:
        query = query.where(Worklog.type.in_(payload.worklog_types))
    if payload.category_ids:
        query = query.where(Worklog.category_id.in_(payload.category_ids))

    return query


@router.post("/custom", response_model=dict[str, Any])
async def get_custom_report(
    payload: CustomReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["Admin", "CEO", "PM", "Employee"])),  # noqa: B008
):
    """Returns a flat list of worklogs with joined user/project info for reporting."""
    query = (
        select(Worklog)
        .options(
            joinedload(Worklog.jira_user).joinedload(JiraUser.org_unit).joinedload(OrgUnit.parent),
            joinedload(Worklog.issue).joinedload(Issue.project),
            joinedload(Worklog.issue).selectinload(Issue.releases),
            joinedload(Worklog.issue).selectinload(Issue.sprints),
            joinedload(Worklog.category),
        )
        .where(Worklog.date >= payload.start_date, Worklog.date <= payload.end_date)
    )

    query = await _apply_custom_filters(query, payload, current_user, db)

    result = await db.execute(query)
    worklogs = result.scalars().unique().all()

    report_data = []
    for w in worklogs:
        h_val = w.hours
        if hasattr(payload, "format") and payload.format == "days" and hasattr(payload, "hours_per_day"):
            h_val = w.hours / payload.hours_per_day

        unit_name = w.jira_user.org_unit.name if w.jira_user and w.jira_user.org_unit else "N/A"
        parent_name = "N/A"
        if w.jira_user and w.jira_user.org_unit and w.jira_user.org_unit.parent:
            parent_name = w.jira_user.org_unit.parent.name

        item = {
            "date": str(w.date),
            "hours": w.hours,
            "value": h_val,
            "type": w.type,
            "user": w.jira_user.display_name if w.jira_user else "N/A",
            "project": w.issue.project.name if w.issue and w.issue.project else "N/A",
            "task": w.issue.summary if w.issue else "N/A",
            "issue_key": w.issue.key if w.issue else "N/A",
            "release": ", ".join([r.name for r in w.issue.releases]) if w.issue and w.issue.releases else "N/A",
            "sprint": ", ".join([s.name for s in w.issue.sprints]) if w.issue and w.issue.sprints else "N/A",
            "category": w.category.name if w.category else "N/A",
            "description": w.description or "",
            "team": unit_name,
            "parent": parent_name,
        }
        report_data.append(item)

    return {"data": report_data}
