from typing import Any

from models.project import Issue, Project, Release, Sprint

# Assuming standard Create/Update schemas for these
from schemas.project import ProjectCreate, ProjectUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.base import CRUDBase


class CRUDProject(CRUDBase[Project, ProjectCreate, ProjectUpdate]):
    async def get_by_key(self, db: AsyncSession, *, key: str) -> Project | None:
        result = await db.execute(select(Project).where(Project.key == key))
        return result.scalar_one_or_none()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, search: str | None = None
    ) -> list[Project]:
        query = select(Project)
        if search:
            from sqlalchemy import or_

            query = query.where(or_(Project.name.ilike(f"%{search}%"), Project.key.ilike(f"%{search}%")))
        
        query = query.order_by(Project.is_active.desc(), Project.name.asc())
        
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()

    async def count(self, db: AsyncSession, *, search: str | None = None) -> int:
        from sqlalchemy import func, or_

        query = select(func.count(Project.id))
        if search:
            query = query.where(or_(Project.name.ilike(f"%{search}%"), Project.key.ilike(f"%{search}%")))
        result = await db.execute(query)
        return result.scalar() or 0


project = CRUDProject(Project)


class CRUDSprint(CRUDBase[Sprint, Any, Any]):
    async def get_by_jira_id(self, db: AsyncSession, *, jira_id: str) -> Sprint | None:
        result = await db.execute(select(Sprint).where(Sprint.jira_id == jira_id))
        return result.scalar_one_or_none()


sprint = CRUDSprint(Sprint)


class CRUDRelease(CRUDBase[Release, Any, Any]):
    async def get_by_jira_id(self, db: AsyncSession, *, jira_id: str) -> Release | None:
        result = await db.execute(select(Release).where(Release.jira_id == jira_id))
        return result.scalar_one_or_none()

    async def get_multi_by_project(self, db: AsyncSession, *, project_id: int) -> list[Release]:
        result = await db.execute(select(Release).where(Release.project_id == project_id))
        return result.scalars().all()


release = CRUDRelease(Release)


class CRUDIssue(CRUDBase[Issue, Any, Any]):
    async def get_by_key(self, db: AsyncSession, *, key: str) -> Issue | None:
        result = await db.execute(select(Issue).where(Issue.key == key))
        return result.scalar_one_or_none()

    async def get_multi_by_project(
        self, db: AsyncSession, *, project_id: int, skip: int = 0, limit: int = 100
    ) -> list[Issue]:
        result = await db.execute(select(Issue).where(Issue.project_id == project_id).offset(skip).limit(limit))
        return result.scalars().all()


issue = CRUDIssue(Issue)
