import asyncio
import logging

from models.user import JiraUser
from saq import CronJob, Queue
from services.jira import sync_jira_projects_to_db, sync_specific_worklogs, sync_user_worklogs
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


async def task_sync_specific_worklogs(ctx, *, worklog_ids: list[str]):
    """Background task to sync specific worklogs by IDs."""
    logger.info(f"Starting sync for specific worklog IDs: {worklog_ids}")
    async with async_session() as db:
        return await sync_specific_worklogs(db, worklog_ids)


async def task_sync_all_projects(ctx):
    """Background task to sync all ACTIVE projects metadata and worklogs.

    Makes a single pass through Jira /worklog/updated, filtered to active projects only.
    This is O(1) Jira API calls regardless of how many active projects there are —
    scaling correctly to 10, 100, or more projects without redundant HTTP requests.
    """
    logger.info("Starting global projects sync")
    async with async_session() as db:
        from models.project import Project
        from services.jira import sync_jira_worklogs

        res = await db.execute(select(Project).where(Project.is_active))
        active_projects = res.scalars().all()

        if not active_projects:
            logger.info("No active projects found for sync")
            return {"status": "success", "synced": 0, "message": "No active projects"}

        active_keys = [p.key for p in active_projects]
        allowed_jira_ids = {str(p.jira_id) for p in active_projects}

        # 1. Refresh project metadata (names, releases, sprints) for active projects
        await sync_jira_projects_to_db(db, only_keys=active_keys)

        # 2. Single-pass worklog sync filtered to active projects — O(1) Jira API calls
        result = await sync_jira_worklogs(db, allowed_project_jira_ids=allowed_jira_ids)

        synced = result.get("synced", 0)
        logger.info(f"Global sync complete: {synced} worklogs synced across {len(active_projects)} projects")
        return {"status": "success", "synced": synced, "projects": len(active_projects)}


async def task_sync_project(ctx, *, project_id: int):
    """Background task to sync worklogs for a specific project."""
    logger.info(f"Starting worklog sync for project ID: {project_id}")
    async with async_session() as db:
        from models.project import Project
        from sqlalchemy import select
        res = await db.execute(select(Project).where(Project.id == project_id))
        project = res.scalar_one_or_none()
        if not project:
            return {"status": "error", "message": "Project not found"}

        from services.jira import sync_jira_worklogs_for_projects
        result = await sync_jira_worklogs_for_projects(db, project_keys=[project.key])
        return result


# Function to run the worker (for CLI usage)
async def run_worker():
    from saq import Worker

    # Define periodic cron jobs
    # Sync all projects and worklogs every hour
    cron_jobs = [CronJob(task_sync_all_projects, cron="0 * * * *", timeout=3600)]

    worker = Worker(
        queue,
        functions=[task_sync_user_worklogs, task_sync_all_projects, task_sync_project, task_sync_specific_worklogs],
        cron_jobs=cron_jobs,
        concurrency=5,
    )
    logger.info("Worker started with periodic task (every hour), concurrency=5")
    await worker.start()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())
