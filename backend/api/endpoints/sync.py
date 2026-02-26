from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from services.jira import sync_jira_worklogs
from api.deps import require_role
from models.user import User

router = APIRouter()

@router.post("/sync")
async def trigger_jira_sync(
    background_tasks: BackgroundTasks,
    since: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["Admin"]))
):
    """
    Trigger manual Jira synchronization.
    Requires Admin role.
    """
    # In a real-world scenario, you might pass db or create a new session inside the background task.
    # Passing AsyncSession directly to BackgroundTasks can be problematic if the route finishes before the task.
    # For safe async background tasks with SQLAlchemy, we typically create a new session inside the task.
    
    # We will await it directly for simplicity here, or you can refactor to use a fresh session maker.
    result = await sync_jira_worklogs(db, since)
    return result