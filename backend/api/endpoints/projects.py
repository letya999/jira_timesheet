import math

from core.database import get_db
from core.worker import queue
from crud.project import project as crud_project
from crud.project import release as crud_release
from crud.project import sprint as crud_sprint
from fastapi import APIRouter, Depends, HTTPException
from models.project import Project
from schemas.pagination import PaginatedResponse
from schemas.project import ProjectResponse, ProjectUpdate, ReleaseResponse, SprintResponse
from services.jira import sync_jira_projects_to_db
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api import deps

router = APIRouter()


@router.post("/refresh")
async def refresh_projects(db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin", "CEO", "PM"]))):
    """Sync projects, releases, and sprints from Jira."""
    count = await sync_jira_projects_to_db(db)
    return {"status": "success", "synced": count}


@router.post("/sync-all")
async def sync_all_active_projects(db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin", "CEO", "PM"]))):
    """Sync worklogs for all active projects via background queue."""
    result = await db.execute(select(Project).where(Project.is_active))
    active_projects = result.scalars().all()

    if not active_projects:
        return {"status": "success", "synced": 0, "message": "No active projects to sync"}

    job = await queue.enqueue("task_sync_all_projects", retries=3, timeout=3600)
    return {"status": "success", "message": "Sync enqueued in background", "job_id": job.id}


@router.get("/", response_model=PaginatedResponse[ProjectResponse])
async def get_projects(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin", "CEO", "PM"])),
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


# Literal sub-paths must be declared before /{project_id} to avoid FastAPI capturing them as path params
@router.get("/issues")
async def search_project_issues(
    search: str, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Search for issues by key or summary."""
    from models.project import Issue
    from sqlalchemy import or_

    result = await db.execute(
        select(Issue).where(or_(Issue.key.ilike(f"%{search}%"), Issue.summary.ilike(f"%{search}%"))).limit(20)
    )
    return result.scalars().all()


@router.post("/{project_id}/sync")
async def sync_single_project(
    project_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Sync worklogs for a specific project via background queue."""
    project = await crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    job = await queue.enqueue("task_sync_project", project_id=project.id, retries=3, timeout=1800)
    return {"status": "success", "message": "Sync enqueued in background", "job_id": job.id}


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin", "CEO", "PM"])),
):
    """Update project status or details."""
    project = await crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await crud_project.update(db, db_obj=project, obj_in=project_in)


@router.get("/{project_id}/sprints", response_model=list[SprintResponse])
async def get_project_sprints(
    project_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Get sprints for a specific project (via issues)."""
    return await crud_sprint.get_multi(db)


@router.get("/{project_id}/releases", response_model=list[ReleaseResponse])
async def get_project_releases(
    project_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin", "CEO", "PM"]))
):
    """Get releases for a specific project."""
    return await crud_release.get_multi_by_project(db, project_id=project_id)
