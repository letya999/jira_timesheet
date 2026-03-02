import math

from core.database import get_db
from crud.project import project as crud_project
from crud.project import release as crud_release
from crud.project import sprint as crud_sprint
from fastapi import APIRouter, Depends, HTTPException
from models.project import Project
from schemas.pagination import PaginatedResponse
from schemas.project import ProjectResponse, ProjectUpdate, ReleaseResponse, SprintResponse
from services.jira import sync_jira_projects_to_db, sync_jira_worklogs_for_projects
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api import deps

router = APIRouter()


@router.post("/refresh")
async def refresh_projects(db: AsyncSession = Depends(get_db), current_user=Depends(deps.get_current_user)):
    """Sync projects, releases, and sprints from Jira."""
    count = await sync_jira_projects_to_db(db)
    return {"status": "success", "synced": count}


@router.post("/sync-all")
async def sync_all_active_projects(db: AsyncSession = Depends(get_db), current_user=Depends(deps.get_current_user)):
    """Sync worklogs for all active projects."""
    # Fetch active projects
    result = await db.execute(select(Project).where(Project.is_active))
    active_projects = result.scalars().all()

    if not active_projects:
        return {"status": "success", "synced": 0, "message": "No active projects to sync"}

    project_keys = [p.key for p in active_projects]
    result = await sync_jira_worklogs_for_projects(db, project_keys=project_keys)
    return result


@router.post("/{project_id}/sync")
async def sync_single_project(
    project_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.get_current_user)
):
    """Sync worklogs for a specific project."""
    project = await crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await sync_jira_worklogs_for_projects(db, project_keys=[project.key])
    return result


@router.get("/", response_model=PaginatedResponse[ProjectResponse])
async def get_projects(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.get_current_user),
    page: int = 1,
    size: int = 50,
    search: str | None = None,
):
    """Get all projects with pagination."""
    skip = (page - 1) * size
    items = await crud_project.get_multi(db, skip=skip, limit=size, search=search)
    total = await crud_project.count(db, search=search)
    pages = math.ceil(total / size) if size > 0 else 1

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Update project status or details."""
    project = await crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await crud_project.update(db, db_obj=project, obj_in=project_in)


@router.get("/{project_id}/sprints", response_model=list[SprintResponse])
async def get_project_sprints(
    project_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.get_current_user)
):
    """Get sprints for a specific project (via issues)."""
    # Note: In our model, sprints are linked to issues.
    # For simplicity, we can fetch all sprints or filter them if we had a direct link.
    # Here we'll return all for now as a placeholder or implement specific logic.
    return await crud_sprint.get_multi(db)


@router.get("/{project_id}/releases", response_model=list[ReleaseResponse])
async def get_project_releases(
    project_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.get_current_user)
):
    """Get releases for a specific project."""
    return await crud_release.get_multi_by_project(db, project_id=project_id)


@router.get("/issues")
async def search_project_issues(
    search: str, db: AsyncSession = Depends(get_db), current_user=Depends(deps.get_current_user)
):
    """Search for issues by key or summary."""
    from models.project import Issue
    from sqlalchemy import or_

    result = await db.execute(
        select(Issue).where(or_(Issue.key.ilike(f"%{search}%"), Issue.summary.ilike(f"%{search}%"))).limit(20)
    )
    return result.scalars().all()
