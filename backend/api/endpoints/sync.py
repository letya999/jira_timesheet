from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from api import deps
from services.jira import sync_user_worklogs

router = APIRouter()

@router.post("/worklogs")
async def sync_my_worklogs(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Trigger background sync of worklogs from Jira."""
    # Note: jira.py needs to be compatible with this call. 
    # The existing jira.py has sync_user_worklogs(db_jira_user, db, days=30)
    # I'll need to fetch the JiraUser first.
    from models.user import JiraUser
    from sqlalchemy import select
    
    if not current_user.jira_user_id:
        return {"status": "error", "message": "No Jira account linked"}
        
    result = await db.execute(select(JiraUser).where(JiraUser.id == current_user.jira_user_id))
    jira_user = result.scalar_one_or_none()
    
    if not jira_user:
        return {"status": "error", "message": "Jira user not found"}
        
    background_tasks.add_task(sync_user_worklogs, jira_user, db, days=30)
    return {"status": "sync_started"}
