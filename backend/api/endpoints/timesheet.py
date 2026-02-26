from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload, joinedload
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
    category: Optional[str] = Query(None, description="Worklog category"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns worklogs filtered by various criteria with pagination.
    """
    filters = []
    
    # Permission check: regular employees only see their own worklogs (via JiraUser association)
    is_privileged = current_user.role in ["Admin", "PM", "CEO"]
    
    if not is_privileged:
        if current_user.jira_user_id:
            filters.append(Worklog.jira_user_id == current_user.jira_user_id)
        else:
            return {"items": [], "total": 0, "page": page, "size": size, "pages": 0}

    if start_date:
        filters.append(Worklog.date >= start_date)
    if end_date:
        filters.append(Worklog.date <= end_date)
    if category:
        filters.append(Worklog.category == category)
        
    query = select(Worklog).where(and_(*filters))
    
    # Eager load relationships to avoid local IO error in async
    query = query.options(
        selectinload(Worklog.jira_user),
        selectinload(Worklog.issue).selectinload(Issue.project)
    )
    
    # Joining for filters
    query = query.outerjoin(Issue, Worklog.issue_id == Issue.id)
    query = query.outerjoin(Project, Issue.project_id == Project.id)
    
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
    
    # Get total count for pagination
    from sqlalchemy import func
    
    # We need to use a subquery or join for count if we filter by joined tables
    count_query = select(func.count(Worklog.id)).select_from(Worklog)
    count_query = count_query.outerjoin(Issue, Worklog.issue_id == Issue.id)
    count_query = count_query.outerjoin(Project, Issue.project_id == Project.id)
    
    if sprint_id:
        from models.project import issue_sprints
        count_query = count_query.outerjoin(issue_sprints, Issue.id == issue_sprints.c.issue_id)
    if release_id:
        from models.project import issue_releases
        count_query = count_query.outerjoin(issue_releases, Issue.id == issue_releases.c.issue_id)
        
    count_query = count_query.where(and_(*filters))
    total = await db.scalar(count_query) or 0
    
    # Pagination
    query = query.order_by(Worklog.date.desc(), Worklog.id.desc())
    query = query.offset((page - 1) * size).limit(size)
    
    result = await db.execute(query)
    worklogs = result.scalars().all()
    
    # Process results into a flat format for frontend
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
            "user_name": wl.jira_user.display_name if wl.jira_user else "Unknown",
            "jira_account_id": wl.jira_user.jira_account_id if wl.jira_user else None
        })
        
    pages = (total + size - 1) // size
    return {
        "items": output,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

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
