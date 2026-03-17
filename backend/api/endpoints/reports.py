import json
from datetime import date
from hashlib import md5
from io import BytesIO
from typing import Any

from core.config import settings
from core.database import get_db
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from fastapi_cache.decorator import cache
from models.category import WorklogCategory
from models.org import OrgUnit, UserOrgRole
from models.project import Issue, IssueType, Sprint
from models.timesheet import Worklog
from models.user import JiraUser, User
from schemas.reports import CustomReportRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from api import deps
from api.deps import get_current_user, require_role

router = APIRouter()


def _join_unique_names(items: list[Any] | None) -> str:
    """Serialize relation objects into comma-separated unique names."""
    if not items:
        return "N/A"
    names = [str(item.name).strip() for item in items if getattr(item, "name", None)]
    if not names:
        return "N/A"
    return ", ".join(dict.fromkeys(names))


@router.get("/dashboard", response_model=dict[str, Any])
@cache(expire=300, namespace="reports")
async def get_dashboard_data(
    start_date: date,
    end_date: date,
    org_unit_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["Admin", "CEO", "PM", "Employee"])),  # noqa: B008
):
    """Returns aggregated data for PM/CEO dashboards."""
    # Stealth filter for regular users (Employee role)
    if deps.normalize_role_name(current_user.role) == "employee":
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
        if deps.is_manager_role(current_user):
            res = await db.execute(select(OrgUnit.id).join(UserOrgRole).where(UserOrgRole.user_id == current_user.id))
            my_unit_ids = [row[0] for row in res.all()]
            if org_unit_id not in my_unit_ids:
                return {"data": []}
        query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).where(JiraUser.org_unit_id == org_unit_id)
    elif deps.is_manager_role(current_user):
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
        unit_id = w.jira_user.org_unit_id if w.jira_user else None

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
            "OrgUnit ID": unit_id,
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
@cache(expire=3600, namespace="reports")
async def get_report_categories(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """Returns all worklog categories for filtering."""
    result = await db.execute(select(WorklogCategory))
    categories = result.scalars().all()
    return [{"id": c.id, "name": c.name} for c in categories]


@router.get("/sprints", response_model=list[dict[str, Any]])
@cache(expire=3600, namespace="reports")
async def get_report_sprints(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """Returns all sprints for filtering."""
    result = await db.execute(select(Sprint).order_by(Sprint.start_date.desc()))
    sprints = result.scalars().all()
    return [{"id": s.id, "name": s.name} for s in sprints]


async def _apply_custom_filters(query, payload: CustomReportRequest, current_user: User, db: AsyncSession):
    """Applies complex filters for custom reports based on roles and payload."""
    # Track which joins have been applied to prevent duplicate joins causing SQL errors
    joined_issue = False
    joined_jira_user = False

    if deps.normalize_role_name(current_user.role) == "employee":
        payload.user_ids = [current_user.jira_user_id] if current_user.jira_user_id else [-1]
        payload.org_unit_id = None
    elif deps.is_manager_role(current_user) and not payload.user_ids and not payload.org_unit_id:
        res = await db.execute(select(OrgUnit.id).join(UserOrgRole).where(UserOrgRole.user_id == current_user.id))
        my_unit_ids = [row[0] for row in res.all()]
        if not my_unit_ids:
            payload.user_ids = [current_user.jira_user_id] if current_user.jira_user_id else [-1]
        else:
            query = query.join(Worklog.jira_user)
            joined_jira_user = True
            query = query.where(JiraUser.org_unit_id.in_(my_unit_ids))

    if payload.project_id:
        query = query.join(Worklog.issue)
        joined_issue = True
        query = query.where(Issue.project_id == payload.project_id)

    if payload.org_unit_id:
        if not joined_jira_user:
            query = query.join(Worklog.jira_user)
            joined_jira_user = True
        query = query.where(JiraUser.org_unit_id == payload.org_unit_id)

    if payload.user_ids:
        query = query.where(Worklog.jira_user_id.in_(payload.user_ids))

    if payload.sprint_ids:
        from models.project import issue_sprints

        if not joined_issue:
            query = query.join(Worklog.issue)
            joined_issue = True
        query = query.join(issue_sprints).where(issue_sprints.c.sprint_id.in_(payload.sprint_ids))

    if payload.worklog_types:
        query = query.where(Worklog.type.in_(payload.worklog_types))

    if payload.category_ids:
        query = query.where(Worklog.category_id.in_(payload.category_ids))

    return query


def _custom_report_cache_key(func, namespace: str, *args, **kwargs) -> str:
    """Cache key for POST /custom that includes request body hash to prevent collisions."""
    payload: CustomReportRequest | None = kwargs.get("payload")
    if payload is None and args:
        payload = args[0]
    body_hash = md5(json.dumps(payload.model_dump(mode="json") if payload else {}, sort_keys=True).encode()).hexdigest()
    return f"{namespace}:{func.__name__}:{body_hash}"


@router.post("/custom", response_model=dict[str, Any])
@cache(expire=300, namespace="reports", key_builder=_custom_report_cache_key)
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
            joinedload(Worklog.issue).joinedload(Issue.issue_type_obj),
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
        h_val = w.hours if payload.format != "days" else w.hours / payload.hours_per_day

        unit_name = w.jira_user.org_unit.name if w.jira_user and w.jira_user.org_unit else "N/A"
        parent_name = "N/A"
        if w.jira_user and w.jira_user.org_unit and w.jira_user.org_unit.parent:
            parent_name = w.jira_user.org_unit.parent.name

        issue_key = w.issue.key if w.issue else None
        issue_link = f"{settings.JIRA_URL}/browse/{issue_key}" if issue_key else "N/A"

        if w.issue and w.issue.issue_type_obj:
            issue_type_val = w.issue.issue_type_obj.name
        elif w.issue and w.issue.issue_type:
            issue_type_val = w.issue.issue_type
        else:
            issue_type_val = "N/A"

        if w.type == "MANUAL":
            issue_name = (w.description.strip() if w.description and w.description.strip() else None) or (
                w.issue.summary if w.issue else "N/A"
            )
        else:
            issue_name = w.issue.summary if w.issue else "N/A"

        item = {
            "date": str(w.date),
            "hours": w.hours,
            "value": h_val,
            "type": w.type,
            "user": w.jira_user.display_name if w.jira_user else "N/A",
            "project": w.issue.project.name if w.issue and w.issue.project else "N/A",
            "task": w.issue.summary if w.issue else "N/A",
            "issue_key": issue_key or "N/A",
            "issue_link": issue_link,
            "issue_name": issue_name,
            "issue_type": issue_type_val,
            "release": _join_unique_names(w.issue.releases if w.issue else None),
            "sprint": _join_unique_names(w.issue.sprints if w.issue else None),
            "category": w.category.name if w.category else "N/A",
            "description": w.description or "",
            "team": unit_name,
            "parent": parent_name,
        }
        report_data.append(item)

    return {"data": report_data}
