from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from datetime import date

from core.database import get_db
from models import JiraLog, ManualLog, User
from schemas.timesheet import JiraLogResponse, ManualLogResponse, ManualLogCreate
from api.deps import get_current_user

router = APIRouter()

@router.get("/", summary="Get Timesheet Data")
async def get_timesheet(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns both Jira logs and Manual logs for the current user in a date range.
    """
    # Fetch Manual Logs
    manual_query = select(ManualLog).where(
        and_(
            ManualLog.user_id == current_user.id,
            ManualLog.date >= start_date,
            ManualLog.date <= end_date
        )
    )
    manual_result = await db.execute(manual_query)
    manual_logs = manual_result.scalars().all()

    # Fetch Jira Logs
    jira_logs = []
    if current_user.jira_account_id:
        jira_query = select(JiraLog).where(
            and_(
                JiraLog.jira_account_id == current_user.jira_account_id,
                JiraLog.date >= start_date,
                JiraLog.date <= end_date
            )
        )
        jira_result = await db.execute(jira_query)
        jira_logs = jira_result.scalars().all()

    return {
        "jira_logs": jira_logs,
        "manual_logs": manual_logs
    }

@router.post("/manual", response_model=ManualLogResponse)
async def create_manual_log(
    log_in: ManualLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_log = ManualLog(
        user_id=current_user.id,
        date=log_in.date,
        time_spent_hours=log_in.time_spent_hours,
        category=log_in.category,
        description=log_in.description
    )
    db.add(db_log)
    await db.commit()
    await db.refresh(db_log)
    return db_log

@router.delete("/manual/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manual_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ManualLog).where(and_(ManualLog.id == log_id, ManualLog.user_id == current_user.id)))
    db_log = result.scalar_one_or_none()
    
    if not db_log:
        raise HTTPException(status_code=404, detail="Log not found")
        
    await db.delete(db_log)
    await db.commit()
    return None
