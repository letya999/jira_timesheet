from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func

from core.database import get_db
from models.project import Project
from schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, JiraProject
from schemas.pagination import PaginatedResponse
from services.jira import fetch_jira_projects, fetch_jira_project_versions, fetch_jira_project_sprints
from api.deps import require_role

router = APIRouter()

@router.post("/refresh", dependencies=[Depends(require_role(["Admin"]))])
async def refresh_projects(db: Annotated[AsyncSession, Depends(get_db)]):
    """Refresh project list from Jira API into DB."""
    from services.jira import sync_jira_projects_to_db
    count = await sync_jira_projects_to_db(db)
    return {"status": "success", "synced_projects": count}

@router.post("/sync-all", dependencies=[Depends(require_role(["Admin"]))])
async def sync_all_active_projects(db: Annotated[AsyncSession, Depends(get_db)]):
    """Sync worklogs for all projects marked as is_active."""
    from services.jira import sync_jira_worklogs_for_projects
    
    result = await db.execute(select(Project).where(Project.is_active == True))
    active_projects = result.scalars().all()
    project_keys = [p.key for p in active_projects]
    
    if not project_keys:
        return {"status": "success", "detail": "No active projects to sync", "synced": 0}
        
    sync_result = await sync_jira_worklogs_for_projects(db, project_keys=project_keys)
    return sync_result

@router.post("/{project_id}/sync", dependencies=[Depends(require_role(["Admin"]))])
async def sync_single_project(
    project_id: int, 
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Sync worklogs for a single project."""
    from services.jira import sync_jira_worklogs_for_projects
    
    db_project = await db.get(Project, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    sync_result = await sync_jira_worklogs_for_projects(db, project_keys=[db_project.key])
    return sync_result

@router.get("/jira", response_model=List[JiraProject], dependencies=[Depends(require_role(["Admin"]))])
async def get_jira_projects():
    """Fetch projects directly from Jira API."""
    projects = await fetch_jira_projects()
    return projects

@router.get("/", response_model=PaginatedResponse[ProjectResponse], dependencies=[Depends(require_role(["Admin"]))])
async def get_db_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 50
):
    """List projects saved in DB with pagination."""
    skip = (page - 1) * size
    
    # Get total count
    count_stmt = select(func.count()).select_from(Project)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    # Get items
    stmt = select(Project).offset(skip).limit(size)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    pages = (total + size - 1) // size
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.post("/", response_model=ProjectResponse, dependencies=[Depends(require_role(["Admin"]))])
async def create_or_update_project(
    project_in: ProjectCreate, 
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Save or update a project's sync settings."""
    result = await db.execute(select(Project).where(Project.jira_id == project_in.jira_id))
    db_project = result.scalar_one_or_none()
    
    if db_project:
        db_project.key = project_in.key
        db_project.name = project_in.name
        db_project.is_active = project_in.is_active
    else:
        db_project = Project(**project_in.model_dump())
        db.add(db_project)
    
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.patch("/{project_id}", response_model=ProjectResponse, dependencies=[Depends(require_role(["Admin"]))])
async def update_project(
    project_id: int, 
    project_in: ProjectUpdate, 
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Update project status."""
    db_project = await db.get(Project, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_in.is_active is not None:
        db_project.is_active = project_in.is_active
        
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/{project_key}/versions", dependencies=[Depends(require_role(["Admin", "CEO", "PM", "Employee"]))])
async def get_project_versions(
    project_key: str,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Fetch versions/releases from local DB for project."""
    from models import Release, Project
    result = await db.execute(
        select(Release)
        .join(Project, Release.project_id == Project.id)
        .where(Project.key == project_key)
    )
    return result.scalars().all()

@router.get("/{project_key}/sprints", dependencies=[Depends(require_role(["Admin", "CEO", "PM", "Employee"]))])
async def get_project_sprints(
    project_key: str,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Fetch sprints from local DB. For simplicity, returns all if project filter not easily available M2M."""
    from models import Sprint, Issue, Project
    # Sprints are related to Issues which are related to Project.
    # To get sprints for a project:
    result = await db.execute(
        select(Sprint)
        .join(Sprint.issues)
        .join(Project, Issue.project_id == Project.id)
        .where(Project.key == project_key)
        .distinct()
    )
    sprints = result.scalars().all()
    if not sprints:
        # Fallback: maybe just return all sprints for now if none found via issues
        result = await db.execute(select(Sprint))
        sprints = result.scalars().all()
    return sprints
