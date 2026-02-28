from typing import List, Dict, Any
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
from models.org import Team, Division, Department
from models.category import WorklogCategory
from fastapi.responses import StreamingResponse
from io import BytesIO

router = APIRouter()

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Returns aggregated data for PM/CEO dashboards."""
    query = select(Worklog).options(
        joinedload(Worklog.jira_user).joinedload(JiraUser.team).joinedload(Team.division).joinedload(Division.department),
        joinedload(Worklog.issue).joinedload(Issue.project),
        joinedload(Worklog.issue).selectinload(Issue.releases),
        joinedload(Worklog.issue).selectinload(Issue.sprints),
        joinedload(Worklog.category)
    ).where(
        Worklog.date >= start_date,
        Worklog.date <= end_date
    )
    
    result = await db.execute(query)
    worklogs = result.scalars().unique().all()
    
    report_data = []
    for w in worklogs:
        month_name = w.date.strftime("%B %Y")
        releases = ", ".join([r.name for r in w.issue.releases]) if w.issue and w.issue.releases else "N/A"
        
        item = {
            "Date": str(w.date),
            "Hours": w.hours,
            "Type": w.type,
            "User": w.jira_user.display_name if w.jira_user else "N/A",
            "Project": w.issue.project.name if w.issue and w.issue.project else "N/A",
            "Task": w.issue.summary if w.issue else "N/A",
            "Issue Key": w.issue.key if w.issue else "N/A",
            "Releases": releases,
            "Category": w.category.name if w.category else "Jira Work",
            "Team": w.jira_user.team.name if w.jira_user and w.jira_user.team else "N/A",
            "Division": w.jira_user.team.division.name if w.jira_user and w.jira_user.team and w.jira_user.team.division else "N/A",
            "Department": w.jira_user.team.division.department.name if w.jira_user and w.jira_user.team and w.jira_user.team.division and w.jira_user.team.division.department else "N/A",
            "Month": month_name
        }
        report_data.append(item)
        
    return {"data": report_data}

@router.get("/export")
async def export_report(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Generates Excel export for the given period."""
    data_resp = await get_dashboard_data(start_date, end_date, db, current_user)
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
    current_user = Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """
    Returns a flat list of worklogs with joined user/project info for reporting.
    """
    query = select(Worklog).options(
        joinedload(Worklog.jira_user).joinedload(JiraUser.team).joinedload(Team.division).joinedload(Division.department),
        joinedload(Worklog.issue).joinedload(Issue.project),
        joinedload(Worklog.issue).selectinload(Issue.releases),
        joinedload(Worklog.issue).selectinload(Issue.sprints),
        joinedload(Worklog.category)
    ).where(
        Worklog.date >= payload.start_date,
        Worklog.date <= payload.end_date
    )
    
    if payload.project_id:
        query = query.join(Issue, Worklog.issue_id == Issue.id).where(Issue.project_id == payload.project_id)
    
    if payload.team_id:
        query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).where(JiraUser.team_id == payload.team_id)
    elif payload.division_id:
        query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).join(Team).where(Team.division_id == payload.division_id)
    elif payload.department_id:
        query = query.join(JiraUser, Worklog.jira_user_id == JiraUser.id).join(Team).join(Division).where(Division.department_id == payload.department_id)
    
    if payload.user_ids:
        query = query.where(Worklog.jira_user_id.in_(payload.user_ids))
        
    if payload.sprint_ids:
        from models.project import issue_sprints
        query = query.join(Issue, Worklog.issue_id == Issue.id).join(issue_sprints).where(issue_sprints.c.sprint_id.in_(payload.sprint_ids))
        
    if payload.worklog_types:
        query = query.where(Worklog.type.in_(payload.worklog_types))
        
    if payload.category_ids:
        query = query.where(Worklog.category_id.in_(payload.category_ids))
        
    result = await db.execute(query)
    worklogs = result.scalars().unique().all()
    
    report_data = []
    for w in worklogs:
        h_val = w.hours
        if payload.format == "days":
            h_val = w.hours / payload.hours_per_day

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
            "team": w.jira_user.team.name if w.jira_user and w.jira_user.team else "N/A",
            "division": w.jira_user.team.division.name if w.jira_user and w.jira_user.team and w.jira_user.team.division else "N/A",
            "department": w.jira_user.team.division.department.name if w.jira_user and w.jira_user.team and w.jira_user.team.division and w.jira_user.team.division.department else "N/A"
        }
        report_data.append(item)
        
    return {"data": report_data}
