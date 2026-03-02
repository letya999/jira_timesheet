import asyncio
import logging

from models.user import JiraUser
from saq import CronJob, Queue
from services.jira import sync_jira_projects_to_db, sync_jira_worklogs, sync_user_worklogs
from sqlalchemy import select

from core.config import settings
from core.database import async_session

logger = logging.getLogger(__name__)

# Redis-based queue configuration
queue = Queue.from_url(settings.REDIS_URL)


async def task_sync_user_worklogs(ctx, *, jira_user_id: int, days: int = 30):
    """Background task to sync specific user's worklogs."""
    logger.info(f"Starting worklog sync for JiraUser ID: {jira_user_id}")
    async with async_session() as db:
        result = await db.execute(select(JiraUser).where(JiraUser.id == jira_user_id))
        jira_user = result.scalar_one_or_none()
        if not jira_user:
            logger.error(f"JiraUser {jira_user_id} not found for sync task")
            return {"status": "error", "message": "User not found"}

        await sync_user_worklogs(jira_user, db, days=days)
        return {"status": "success", "user_id": jira_user_id}


async def task_sync_all_projects(ctx):
    """Background task to sync all projects and their worklogs."""
    logger.info("Starting global projects and worklogs sync")
    async with async_session() as db:
        # 1. Sync projects, sprints, releases
        await sync_jira_projects_to_db(db)
        # 2. Sync worklogs for all projects
        await sync_jira_worklogs(db)
        return {"status": "success"}


# Function to run the worker (for CLI usage)
async def run_worker():
    from saq import Worker

    # Define periodic cron jobs
    # Sync all projects and worklogs every hour
    cron_jobs = [CronJob(task_sync_all_projects, cron="0 * * * *")]

    worker = Worker(queue, functions=[task_sync_user_worklogs, task_sync_all_projects], cron_jobs=cron_jobs)
    logger.info("Worker started with periodic task (every hour)")
    await worker.start()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())
