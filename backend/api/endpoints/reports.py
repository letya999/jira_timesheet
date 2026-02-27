from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload, joinedload
from fastapi.responses import StreamingResponse
from datetime import date, timedelta
from typing import Optional, List

from core.database import get_db
from models import User, Worklog, JiraUser, Team, Division, Department, Issue, Project, Sprint, Release
from api.deps import get_current_user, require_role
from services.analytics import generate_pivot_table_data, generate_excel_report
from schemas.reports import CustomReportRequest

router = APIRouter()

@router.post("/custom")
async def get_custom_report(
    request: CustomReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "CEO", "PM"]))
):
    """
    Highly flexible report builder.
    """
    filters = [
        Worklog.date >= request.start_date,
        Worklog.date <= request.end_date
    ]
    
    # 1. Fetching logic
    stmt = (
        select(Worklog)
        .options(
            joinedload(Worklog.jira_user).joinedload(JiraUser.user).joinedload(User.team).joinedload(Team.division).joinedload(Division.department),
            joinedload(Worklog.issue).joinedload(Issue.project),
            joinedload(Worklog.issue).selectinload(Issue.sprints),
            joinedload(Worklog.issue).selectinload(Issue.releases)
        )
    )
    
    # Apply filters
    if request.project_id:
        filters.append(Worklog.issue.has(Issue.project_id == request.project_id))
    if request.release_id:
        filters.append(Worklog.issue.has(Issue.releases.any(Release.id == request.release_id)))
    if request.sprint_id:
        filters.append(Worklog.issue.has(Issue.sprints.any(Sprint.id == request.sprint_id)))
    
    # Hierarchy filters
    if request.team_id:
        filters.append(Worklog.jira_user.has(JiraUser.user.has(User.team_id == request.team_id)))
    elif request.division_id:
        filters.append(Worklog.jira_user.has(JiraUser.user.has(User.team.has(Team.division_id == request.division_id))))
    elif request.department_id:
        filters.append(Worklog.jira_user.has(JiraUser.user.has(User.team.has(Team.division.has(Division.department_id == request.department_id)))))

    stmt = stmt.where(and_(*filters))
    
    result = await db.execute(stmt)
    worklogs = result.scalars().unique().all()
    
    # 2. Processing logic
    flat_data = []
    for wl in worklogs:
        # User/Hierarchy info
        user = wl.jira_user.user if wl.jira_user and wl.jira_user.user else None
        team = user.team if user else None
        division = team.division if team else None
        department = division.department if division else None
        
        # Project/Issue info
        issue = wl.issue
        project = issue.project if issue else None
        
        # Sprints/Releases (joining multiple if present)
        sprint_name = ", ".join([s.name for s in issue.sprints]) if issue and issue.sprints else "No Sprint"
        release_name = ", ".join([r.name for r in issue.releases]) if issue and issue.releases else "No Release"
        
        val = wl.time_spent_hours
        if request.format == "days":
            val = val / request.hours_per_day
            
        row = {
            "date": wl.date,
            "user": user.full_name if user else wl.jira_user.display_name,
            "project": project.name if project else "Manual/Other",
            "task": issue.summary if issue else (wl.description[:50] if wl.description else "No Description"),
            "issue_key": issue.key if issue else None,
            "sprint": sprint_name,
            "release": release_name,
            "team": team.name if team else "No Team",
            "division": division.name if division else "No Division",
            "department": department.name if department else "No Department",
            "hours": wl.time_spent_hours,
            "value": val
        }
        
        # Date granularity additions
        d = wl.date
        if request.date_granularity == "week":
            # Monday of the week
            row["week"] = d - timedelta(days=d.weekday())
        elif request.date_granularity == "2weeks":
            # Bi-weekly grouping (naive: week number / 2)
            row["2weeks"] = d - timedelta(days=d.weekday() + (7 if (d.isocalendar()[1] % 2 == 0) else 0))
        elif request.date_granularity == "month":
            row["month"] = d.replace(day=1)
        elif request.date_granularity == "quarter":
            quarter = (d.month - 1) // 3 + 1
            row["quarter"] = f"Q{quarter} {d.year}"
            
        flat_data.append(row)

    return {"data": flat_data}

@router.get("/dashboard")
async def get_dashboard_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "CEO", "PM"]))
):
    # 1. Fetch Worklogs with associated User and Org data
    # We join Worklog -> JiraUser -> User -> Team -> Division -> Department
    stmt = (
        select(
            Worklog,
            User.full_name,
            Team.name.label("team_name"),
            Department.name.label("department_name"),
            Issue.key.label("issue_key")
        )
        .join(JiraUser, Worklog.jira_user_id == JiraUser.id)
        .outerjoin(User, JiraUser.id == User.jira_user_id)
        .outerjoin(Team, User.team_id == Team.id)
        .outerjoin(Division, Team.division_id == Division.id)
        .outerjoin(Department, Division.department_id == Department.id)
        .outerjoin(Issue, Worklog.issue_id == Issue.id)
        .where(and_(Worklog.date >= start_date, Worklog.date <= end_date))
    )
    
    result = await db.execute(stmt)
    
    combined_data = []
    for row in result:
        log = row.Worklog
        combined_data.append({
            "User": row.full_name or "Unlinked Jira User",
            "Team": row.team_name,
            "Department": row.department_name,
            "Date": log.date,
            "Hours": log.time_spent_hours,
            "Type": log.type.capitalize(),
            "Category": log.category or "Jira Work",
            "Task": row.issue_key or log.description or "N/A"
        })

    return {"data": combined_data}

@router.get("/export")
async def export_excel_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "CEO"]))
):
    data_res = await get_dashboard_data(start_date, end_date, db, current_user)
    combined_data = data_res["data"]
    
    import pandas as pd
    df = pd.DataFrame(combined_data)
    if df.empty:
         df = pd.DataFrame(columns=["User", "Team", "Department", "Date", "Hours", "Type", "Category", "Task"])
         
    excel_file = generate_excel_report(df)
    
    filename = f"Timesheet_Report_{start_date}_to_{end_date}.xlsx"
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
