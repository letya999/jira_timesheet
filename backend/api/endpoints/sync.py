from core.database import get_db
from core.worker import queue
from fastapi import APIRouter, Depends
from models.user import JiraUser
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api import deps

router = APIRouter()

@router.post("/worklogs")
async def sync_my_worklogs(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Trigger background sync of worklogs from Jira via SAQ."""
    if not current_user.jira_user_id:
        return {"status": "error", "message": "No Jira account linked"}

    result = await db.execute(select(JiraUser).where(JiraUser.id == current_user.jira_user_id))
    jira_user = result.scalar_one_or_none()

    if not jira_user:
        return {"status": "error", "message": "Jira user not found"}

    # Enqueue task to SAQ with retries and timeout for robustness
    await queue.enqueue(
        "task_sync_user_worklogs",
        jira_user_id=jira_user.id,
        days=30,
        retries=5,
        timeout=1800
    )
    return {"status": "sync_enqueued"}

@router.post("/projects")
async def sync_all_projects_endpoint(
    current_user = Depends(deps.require_role(["Admin"]))
):
    """Admin-only: Trigger global sync of all projects and worklogs."""
    await queue.enqueue(
        "task_sync_all_projects",
        retries=3,
        timeout=3600
    )
    return {"status": "global_sync_enqueued"}
