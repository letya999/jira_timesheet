from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi.responses import StreamingResponse
from datetime import date
from typing import Optional

from core.database import get_db
from models import User, Worklog, JiraUser, Team, Division, Department, Issue
from api.deps import get_current_user, require_role
from services.analytics import generate_pivot_table_data, generate_excel_report

router = APIRouter()

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
