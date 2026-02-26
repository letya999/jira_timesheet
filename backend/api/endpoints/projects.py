from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from core.database import get_db
from models.project import Project
from schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, JiraProject
from services.jira import fetch_jira_projects
from api.deps import require_role

router = APIRouter()

@router.get("/jira", response_model=List[JiraProject], dependencies=[Depends(require_role(["Admin"]))])
async def get_jira_projects():
    """Fetch projects directly from Jira API."""
    projects = await fetch_jira_projects()
    return projects

@router.get("/", response_model=List[ProjectResponse], dependencies=[Depends(require_role(["Admin"]))])
async def get_db_projects(db: AsyncSession = Depends(get_db)):
    """List projects saved in DB."""
    result = await db.execute(select(Project))
    return result.scalars().all()

@router.post("/", response_model=ProjectResponse, dependencies=[Depends(require_role(["Admin"]))])
async def create_or_update_project(project_in: ProjectCreate, db: AsyncSession = Depends(get_db)):
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
async def update_project(project_id: int, project_in: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    """Update project status."""
    db_project = await db.get(Project, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_in.is_active is not None:
        db_project.is_active = project_in.is_active
        
    await db.commit()
    await db.refresh(db_project)
    return db_project
