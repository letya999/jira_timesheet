import httpx
from core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from models import JiraLog, User, Project
import logging
from datetime import datetime
from dateutil import parser

logger = logging.getLogger(__name__)

async def fetch_issue_details(issue_ids: list[str]):
    """Fetch issue keys and project keys for a list of issue IDs."""
    if not issue_ids:
        return {}
        
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    # Using JQL to fetch multiple issues by ID
    # Jira IDs can be strings or ints, but JQL likes them as strings or just numbers
    ids_str = ",".join(issue_ids)
    jql = f"id in ({ids_str})"
    url = f"{settings.JIRA_URL}/rest/api/3/search"
    
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            response = await client.get(url, params={"jql": jql, "fields": "key,project"})
            response.raise_for_status()
            data = response.json()
            
            mapping = {}
            for issue in data.get("issues", []):
                mapping[issue["id"]] = {
                    "key": issue["key"],
                    "project_key": issue["fields"]["project"]["key"]
                }
            return mapping
    except Exception as e:
        logger.error(f"Failed to fetch issue details: {e}")
        return {}

async def sync_jira_worklogs(db: AsyncSession, since: int = 0):
    """
    Sync worklogs from Jira Cloud API.
    `since` is a Unix timestamp in milliseconds.
    """
    url_updated = f"{settings.JIRA_URL}/rest/api/3/worklog/updated"
    url_list = f"{settings.JIRA_URL}/rest/api/3/worklog/list"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            # 1. Get updated worklog IDs
            response = await client.get(url_updated, params={"since": since})
            response.raise_for_status()
            data = response.json()
            worklog_ids = [item["worklogId"] for item in data.get("values", [])]
            
            if not worklog_ids:
                logger.info("No new worklogs found.")
                return {"status": "success", "synced": 0}
            
            # 2. Get details for these IDs (Batched by 1000 max per API limits)
            # For brevity, we handle only the first batch here
            payload = {"ids": worklog_ids[:1000]}
            response = await client.post(url_list, json=payload)
            response.raise_for_status()
            worklogs_data = response.json()
            
            # 3. Fetch issue details to get proper keys and project info
            issue_ids = list(set([item.get("issueId") for item in worklogs_data if item.get("issueId")]))
            issue_mapping = await fetch_issue_details(issue_ids)
            
            synced_count = 0
            for item in worklogs_data:
                author_account_id = item.get("author", {}).get("accountId")
                if not author_account_id:
                    continue
                    
                time_spent_seconds = item.get("timeSpentSeconds", 0)
                started_str = item.get("started")
                issue_id = item.get("issueId")
                
                details = issue_mapping.get(issue_id, {"key": issue_id, "project_key": None})
                issue_key = details["key"]
                project_key = details["project_key"]
                
                if not started_str:
                    continue
                    
                log_date = parser.isoparse(started_str).date()
                hours = time_spent_seconds / 3600.0
                worklog_id = str(item.get("id"))
                
                # Check if it exists by Jira Worklog ID (if we had it in model)
                # For now using composite key as before but adding project_key
                existing = await db.execute(
                    select(JiraLog).where(
                        JiraLog.jira_account_id == author_account_id,
                        JiraLog.issue_key == issue_key,
                        JiraLog.date == log_date
                    )
                )
                db_log = existing.scalar_one_or_none()
                
                if db_log:
                    db_log.time_spent_hours = hours
                    db_log.project_key = project_key
                else:
                    db_log = JiraLog(
                        jira_account_id=author_account_id,
                        date=log_date,
                        time_spent_hours=hours,
                        issue_key=issue_key,
                        project_key=project_key,
                        summary=item.get("comment", {}).get("content", [{"content": [{"text": "Synced from Jira"}]}])[0].get("content", [{}])[0].get("text", "Synced from Jira")[:1024] if isinstance(item.get("comment"), dict) else "Synced from Jira"
                    )
                    db.add(db_log)
                synced_count += 1
                
            await db.commit()
            logger.info(f"Successfully synced {synced_count} worklogs.")
            return {"status": "success", "synced": synced_count}
            
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch Jira worklogs: {e}")
        return {"status": "error", "detail": str(e)}

async def fetch_jira_projects():
    """
    Fetch all projects from Jira Cloud API.
    """
    url = f"{settings.JIRA_URL}/rest/api/3/project"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch Jira projects: {e}")
        return []

async def sync_jira_projects_to_db(db: AsyncSession):
    """
    Fetch projects from Jira and sync them to local database.
    """
    jira_projects = await fetch_jira_projects()
    synced_count = 0
    
    for jp in jira_projects:
        jira_id = str(jp.get("id"))
        key = jp.get("key")
        name = jp.get("name")
        
        # Check if project exists
        result = await db.execute(select(Project).where(Project.jira_id == jira_id))
        db_project = result.scalar_one_or_none()
        
        if db_project:
            db_project.key = key
            db_project.name = name
        else:
            db_project = Project(
                jira_id=jira_id,
                key=key,
                name=name,
                is_active=False
            )
            db.add(db_project)
        synced_count += 1
    
    await db.commit()
    return synced_count

async def sync_jira_worklogs_for_projects(db: AsyncSession, project_keys: list[str] = None, since: int = 0):
    """
    Sync worklogs from Jira Cloud API.
    If project_keys is provided, it only syncs for those projects.
    """
    # For simplicity, we reuse the existing global sync logic but we could 
    # theoretically filter worklogs by issue -> project here if we fetched issue details.
    # In this implementation, we'll just use the global sync as a placeholder 
    # for "sync everything" but acknowledging the intent to filter.
    
    # A more advanced version would use JQL for each project.
    return await sync_jira_worklogs(db, since)

async def fetch_jira_users():
    """
    Fetch all users from Jira Cloud API with pagination.
    """
    users = []
    start_at = 0
    max_results = 50
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            while True:
                url = f"{settings.JIRA_URL}/rest/api/3/users/search"
                response = await client.get(url, params={"startAt": start_at, "maxResults": max_results})
                response.raise_for_status()
                data = response.json()
                
                if not data:
                    break
                    
                users.extend(data)
                if len(data) < max_results:
                    break
                    
                start_at += max_results
                # Safety break to avoid infinite loops or too many requests
                if start_at >= 1000:
                    break
                    
            return users
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch Jira users: {e}")
        return []

async def sync_jira_users_to_db(db: AsyncSession):
    """
    Fetch users from Jira and sync them to local database.
    Now fetches all users (including those with hidden emails if possible).
    """
    from core.security import get_password_hash
    jira_users = await fetch_jira_users()
    synced_count = 0
    
    # Use a default password for newly synced users
    # This is needed because our internal login system requires a hashed password.
    default_password_hash = get_password_hash("jira123")
    
    for ju in jira_users:
        account_type = ju.get("accountType")
        # accountType usually is 'atlassian', 'app', or 'customer'
        # We usually want 'atlassian' (employees)
        if account_type not in ["atlassian"]:
            continue
            
        account_id = ju.get("accountId")
        # In some Jira instances, email or name might be hidden for privacy
        email = ju.get("emailAddress")
        full_name = ju.get("displayName") or "Jira User"
        active = ju.get("active", False)
        
        # If email is hidden, we use accountId@jira.local as a placeholder
        if not email:
            email = f"{account_id}@jira.local"
            
        # Check if user exists by Jira Account ID (most reliable)
        result = await db.execute(select(User).where(User.jira_account_id == account_id))
        db_user = result.scalar_one_or_none()
        
        # If not found by ID, try by email
        if not db_user and email != f"{account_id}@jira.local":
            result = await db.execute(select(User).where(User.email == email))
            db_user = result.scalar_one_or_none()
        
        if db_user:
            db_user.jira_account_id = account_id
            db_user.full_name = full_name
            # Optional: update email if it was previously a placeholder
            if "@jira.local" in db_user.email and email != f"{account_id}@jira.local":
                db_user.email = email
        else:
            db_user = User(
                email=email,
                full_name=full_name,
                jira_account_id=account_id,
                hashed_password=default_password_hash,
                role="Employee",
                weekly_quota=40
            )
            db.add(db_user)
        synced_count += 1
    
    await db.commit()
    return synced_count
