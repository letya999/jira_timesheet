from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import date

from core.database import get_db
from models import Worklog, User, JiraUser, Issue, Project, Sprint, Release
from api.deps import get_current_user

router = APIRouter()

@router.get("/", summary="Get Timesheet Data")
async def get_timesheet(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    project_id: Optional[int] = Query(None, description="Local Project ID"),
    sprint_id: Optional[int] = Query(None, description="Local Sprint ID"),
    release_id: Optional[int] = Query(None, description="Local Release ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns worklogs filtered by various criteria.
    """
    filters = []
    
    # Permission check: regular employees only see their own worklogs (via JiraUser association)
    is_privileged = current_user.role in ["Admin", "PM", "CEO"]
    
    if not is_privileged:
        if current_user.jira_user_id:
            filters.append(Worklog.jira_user_id == current_user.jira_user_id)
        else:
            # If system user has no linked JiraUser and not privileged, they see nothing or only manual?
            # Usually we link them. If not linked, return empty.
            return {"worklogs": []}

    if start_date:
        filters.append(Worklog.date >= start_date)
    if end_date:
        filters.append(Worklog.date <= end_date)
        
    query = select(Worklog).where(and_(*filters))
    
    # Joining for filters and metadata
    if project_id or sprint_id or release_id or True: # Always join common ones
        query = query.outerjoin(Issue, Worklog.issue_id == Issue.id)
        query = query.outerjoin(Project, Issue.project_id == Project.id)
        query = query.outerjoin(JiraUser, Worklog.jira_user_id == JiraUser.id)
    
    if project_id:
        filters.append(Project.id == project_id)
    if sprint_id:
        from models.project import issue_sprints
        query = query.outerjoin(issue_sprints, Issue.id == issue_sprints.c.issue_id)
        filters.append(issue_sprints.c.sprint_id == sprint_id)
    if release_id:
        from models.project import issue_releases
        query = query.outerjoin(issue_releases, Issue.id == issue_releases.c.issue_id)
        filters.append(issue_releases.c.release_id == release_id)

    # Re-apply filters with joins
    query = query.where(and_(*filters))
    
    result = await db.execute(query)
    worklogs = result.scalars().all()
    
    # Process results into a flat format for frontend
    # In a real app, use Pydantic models with relationships
    output = []
    for wl in worklogs:
        output.append({
            "id": wl.id,
            "date": wl.date,
            "hours": wl.time_spent_hours,
            "type": wl.type,
            "category": wl.category,
            "description": wl.description,
            "issue_key": wl.issue.key if wl.issue else None,
            "issue_summary": wl.issue.summary if wl.issue else None,
            "project_key": wl.issue.project.key if wl.issue and wl.issue.project else None,
            "user_name": wl.jira_user.display_name if wl.jira_user else "Unknown"
        })
        
    return {"worklogs": output}

@router.post("/manual")
async def create_manual_log(
    date: date,
    hours: float,
    category: str,
    description: Optional[str] = None,
    issue_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.jira_user_id:
        raise HTTPException(status_code=400, detail="Current user not linked to any Jira account")
        
    db_log = Worklog(
        type="MANUAL",
        date=date,
        time_spent_hours=hours,
        category=category,
        description=description,
        jira_user_id=current_user.jira_user_id,
        issue_id=issue_id
    )
    db.add(db_log)
    await db.commit()
    await db.refresh(db_log)
    return db_log

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_worklog(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only allow deleting manual logs created by the user
    query = select(Worklog).where(and_(
        Worklog.id == log_id, 
        Worklog.type == "MANUAL",
        Worklog.jira_user_id == current_user.jira_user_id
    ))
    result = await db.execute(query)
    db_log = result.scalar_one_or_none()
    
    if not db_log:
        raise HTTPException(status_code=404, detail="Log not found or not authorized to delete")
        
    await db.delete(db_log)
    await db.commit()
    return None
