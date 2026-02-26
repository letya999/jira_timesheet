from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi.responses import StreamingResponse
from datetime import date
from typing import Optional

from core.database import get_db
from models import User, JiraLog, ManualLog, Team, Division, Department
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
    # Fetch all data for reports (In reality, filter by PM's team if PM)
    
    # 1. Fetch Users & Org Structure (Simplified join)
    users_stmt = (
        select(User.id, User.full_name, User.role, Team.name.label("team_name"), Division.name.label("division_name"), Department.name.label("department_name"))
        .outerjoin(Team, User.team_id == Team.id)
        .outerjoin(Division, Team.division_id == Division.id)
        .outerjoin(Department, Division.department_id == Department.id)
    )
    
    users_result = await db.execute(users_stmt)
    users_info = {row.id: dict(row._mapping) for row in users_result}

    # 2. Fetch Manual Logs
    manual_stmt = select(ManualLog).where(
        (ManualLog.date >= start_date) & (ManualLog.date <= end_date)
    )
    manual_res = await db.execute(manual_stmt)
    manual_logs = manual_res.scalars().all()

    # 3. Fetch Jira Logs
    jira_stmt = select(JiraLog, User.id.label("user_id")).join(User, JiraLog.jira_account_id == User.jira_account_id).where(
        (JiraLog.date >= start_date) & (JiraLog.date <= end_date)
    )
    jira_res = await db.execute(jira_stmt)
    
    combined_data = []
    
    for log in manual_logs:
        u_info = users_info.get(log.user_id, {})
        combined_data.append({
            "User": u_info.get("full_name"),
            "Team": u_info.get("team_name"),
            "Department": u_info.get("department_name"),
            "Date": log.date,
            "Hours": log.time_spent_hours,
            "Type": "Manual",
            "Category": log.category,
            "Task": log.description
        })

    for log, u_id in jira_res:
        u_info = users_info.get(u_id, {})
        combined_data.append({
            "User": u_info.get("full_name"),
            "Team": u_info.get("team_name"),
            "Department": u_info.get("department_name"),
            "Date": log.date,
            "Hours": log.time_spent_hours,
            "Type": "Jira",
            "Category": "Jira Work",
            "Task": log.issue_key,
            "Release": log.release
        })

    return {"data": combined_data}

@router.get("/export")
async def export_excel_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["Admin", "CEO"]))
):
    # Reuse dashboard logic (Refactor to shared function later)
    # For now, fetching minimal data to export
    users_stmt = select(User.id, User.full_name, Team.name.label("team_name")).outerjoin(Team)
    users_result = await db.execute(users_stmt)
    users_info = {row.id: dict(row._mapping) for row in users_result}

    manual_res = await db.execute(select(ManualLog).where((ManualLog.date >= start_date) & (ManualLog.date <= end_date)))
    combined_data = []
    for log in manual_res.scalars():
        u_info = users_info.get(log.user_id, {})
        combined_data.append({
            "Employee": u_info.get("full_name"),
            "Team": u_info.get("team_name"),
            "Date": str(log.date),
            "Hours": log.time_spent_hours,
            "Category": log.category
        })
        
    import pandas as pd
    df = pd.DataFrame(combined_data)
    if df.empty:
         df = pd.DataFrame(columns=["Employee", "Team", "Date", "Hours", "Category"])
         
    excel_file = generate_excel_report(df)
    
    filename = f"Timesheet_Report_{start_date}_to_{end_date}.xlsx"
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )