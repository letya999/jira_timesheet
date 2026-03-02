from core.database import get_db
from core.worker import queue
from fastapi import APIRouter, Depends, Request
from fastapi_cache import FastAPICache
from fastapi_limiter.depends import RateLimiter
from models.user import JiraUser
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api import deps

router = APIRouter()


@router.post("/worklogs", dependencies=[Depends(RateLimiter(times=2, seconds=60))])
async def sync_my_worklogs(db: AsyncSession = Depends(get_db), current_user=Depends(deps.get_current_user)):
    """Trigger background sync of worklogs from Jira via SAQ."""
    if not current_user.jira_user_id:
        return {"status": "error", "message": "No Jira account linked"}

    result = await db.execute(select(JiraUser).where(JiraUser.id == current_user.jira_user_id))
    jira_user = result.scalar_one_or_none()

    if not jira_user:
        return {"status": "error", "message": "Jira user not found"}

    # Enqueue task to SAQ with retries and timeout for robustness
    await queue.enqueue("task_sync_user_worklogs", jira_user_id=jira_user.id, days=30, retries=5, timeout=1800)
    await FastAPICache.clear(namespace="reports")
    return {"status": "sync_enqueued"}


@router.post("/projects", dependencies=[Depends(RateLimiter(times=1, seconds=60))])
async def sync_all_projects_endpoint(current_user=Depends(deps.require_role(["Admin"]))):
    """Admin-only: Trigger global sync of all projects and worklogs."""
    job = await queue.enqueue("task_sync_all_projects", retries=3, timeout=3600)
    await FastAPICache.clear(namespace="reports")
    return {"status": "global_sync_enqueued", "job_id": job.id}


@router.post("/webhooks/jira")
async def jira_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Jira webhooks for real-time sync of worklogs."""
    try:
        payload = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON"}

    event = payload.get("webhookEvent")
    # Jira events for worklogs
    if event in ["worklog_created", "worklog_updated", "worklog_deleted"]:
        worklog = payload.get("worklog", {})
        worklog_id = worklog.get("id")
        if worklog_id:
            # Enqueue a task to sync this specific worklog
            await queue.enqueue("task_sync_specific_worklogs", worklog_ids=[str(worklog_id)])
            await FastAPICache.clear(namespace="reports")
            return {"status": "webhook_received", "event": event, "worklog_id": worklog_id}

    return {"status": "ignored", "event": event}


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str, current_user=Depends(deps.get_current_user)):
    """Check the status and result of a background job."""
    # job_id can be a full key or just UUID
    # SAQ 0.26.1 queue.job(key) expects the key without 'saq:job:{queue_name}:' prefix if called with job_id
    # But queue.job technically takes the 'key'.
    # In our tests, q.job(UUID) worked, but q.job(full_key) did not.

    # Try direct key first
    job = await queue.job(job_id)

    # If not found and it looks like a full key, try stripping prefix
    if not job and job_id.startswith("saq:job:"):
        # Extract the last part (UUID)
        uuid_part = job_id.split(":")[-1]
        job = await queue.job(uuid_part)

    if not job:
        return {"status": "not_found"}

    # SAQ status is an Enum, need to convert to string
    status_str = job.status
    if not isinstance(status_str, str):
        # Handle enum if necessary
        status_str = str(status_str).split(".")[-1].lower()

    return {
        "id": job.id,
        "status": status_str,  # queued, active, aborted, complete
        "result": job.result,
        "error": job.error,
        "completed": job.completed > 0 if job.completed else False,
    }
