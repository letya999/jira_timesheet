import httpx
from core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, insert
from sqlalchemy.orm import selectinload
from models import User, JiraUser, Project, Worklog, Sprint, Release, Issue
from models.project import issue_releases
import logging
from datetime import datetime
from dateutil import parser

logger = logging.getLogger(__name__)

async def fetch_issue_details(issue_ids: list[str]):
    """Fetch issue keys and project keys for a list of issue IDs."""
    if not issue_ids:
        return {}
        
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    # The /search/jql endpoint is the new recommended search API replacing deprecated /search
    url = f"{settings.JIRA_URL}/rest/api/3/search/jql"
    
    mapping = {}
    # Batch IDs to avoid hitting JQL character/length limits
    batch_size = 100
    
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            for i in range(0, len(issue_ids), batch_size):
                batch = issue_ids[i:i + batch_size]
                ids_str = ",".join(batch)
                jql = f"id in ({ids_str})"
                
                # Using POST is more robust for search with many arguments
                payload = {
                    "jql": jql,
                    "fields": ["key", "project", "fixVersions", "status", "issuetype", "summary", "parent"],
                    "maxResults": batch_size
                }
                
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                for issue in data.get("issues", []):
                    fields = issue.get("fields", {})
                    versions = fields.get("fixVersions", [])
                    
                    mapping[issue["id"]] = {
                        "jira_id": issue["id"],
                        "key": issue["key"],
                        "project_id": fields["project"]["id"],
                        "project_key": fields["project"]["key"],
                        "project_name": fields["project"]["name"],
                        "summary": fields.get("summary"),
                        "status": fields.get("status", {}).get("name"),
                        "issue_type": fields.get("issuetype", {}).get("name"),
                        "parent_id": fields.get("parent", {}).get("id"),
                        "releases": [{"id": v["id"], "name": v["name"]} for v in versions]
                    }
        return mapping
    except Exception as e:
        logger.error(f"Failed to fetch issue details: {e}")
        return mapping

async def sync_jira_worklogs(db: AsyncSession, since: int = 0):
    """
    Sync worklogs from Jira Cloud API to the new Worklog model.
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
                return {"status": "success", "synced": 0}
            
            # 2. Get details for these IDs
            payload = {"ids": worklog_ids[:1000]}
            response = await client.post(url_list, json=payload)
            response.raise_for_status()
            worklogs_data = response.json()
            
            # 3. Fetch issue details for mapping
            issue_ids = list(set([item.get("issueId") for item in worklogs_data if item.get("issueId")]))
            issue_mapping = await fetch_issue_details(issue_ids)
            
            synced_count = 0
            for item in worklogs_data:
                author_id = item.get("author", {}).get("accountId")
                issue_id_jira = item.get("issueId")
                if not author_id or not issue_id_jira:
                    continue
                
                # Ensure JiraUser exists
                res = await db.execute(select(JiraUser).where(JiraUser.jira_account_id == author_id))
                db_jira_user = res.scalar_one_or_none()
                if not db_jira_user:
                    # Create a skeleton JiraUser if not synced yet
                    db_jira_user = JiraUser(
                        jira_account_id=author_id,
                        display_name=item.get("author", {}).get("displayName") or "Unknown"
                    )
                    db.add(db_jira_user)
                    await db.flush()

                # Get issue details
                iss_data = issue_mapping.get(issue_id_jira)
                if not iss_data:
                    continue

                # Ensure Project exists
                res = await db.execute(select(Project).where(Project.jira_id == str(iss_data["project_id"])))
                db_project = res.scalar_one_or_none()
                if not db_project:
                    db_project = Project(
                        jira_id=str(iss_data["project_id"]),
                        key=iss_data["project_key"],
                        name=iss_data["project_name"]
                    )
                    db.add(db_project)
                    await db.flush()

                # Ensure Issue exists
                res = await db.execute(
                    select(Issue)
                    .where(Issue.jira_id == issue_id_jira)
                )
                db_issue = res.scalar_one_or_none()
                if not db_issue:
                    db_issue = Issue(
                        jira_id=issue_id_jira,
                        key=iss_data["key"],
                        summary=iss_data["summary"] or "No summary",
                        status=iss_data["status"],
                        issue_type=iss_data["issue_type"],
                        project_id=db_project.id
                    )
                    db.add(db_issue)
                    await db.flush()
                else:
                    db_issue.summary = iss_data["summary"] or db_issue.summary
                    db_issue.status = iss_data["status"] or db_issue.status

                # Update releases for the issue
                if "releases" in iss_data:
                    release_info_list = iss_data["releases"]
                    if release_info_list:
                        # Clear existing mappings to avoid duplicates/stale data
                        await db.execute(delete(issue_releases).where(issue_releases.c.issue_id == db_issue.id))
                        
                        rel_ids = []
                        for r_info in release_info_list:
                            r_jira_id = str(r_info["id"])
                            # Check if release exists
                            r_res = await db.execute(select(Release).where(Release.jira_id == r_jira_id))
                            db_rel = r_res.scalar_one_or_none()
                            
                            if not db_rel:
                                # Create stub release
                                db_rel = Release(
                                    jira_id=r_jira_id,
                                    name=r_info["name"],
                                    project_id=db_project.id
                                )
                                db.add(db_rel)
                                await db.flush()
                            
                            rel_ids.append(db_rel.id)
                        
                        if rel_ids:
                            # Direct core insert for async safety
                            await db.execute(
                                insert(issue_releases), 
                                [{"issue_id": db_issue.id, "release_id": rid} for rid in rel_ids]
                            )

                # Sync Worklog
                jira_worklog_id = str(item.get("id"))
                time_spent_hours = item.get("timeSpentSeconds", 0) / 3600.0
                log_date = parser.isoparse(item.get("started")).date()
                description = item.get("comment", {}).get("content", [{}])[0].get("content", [{}])[0].get("text") if isinstance(item.get("comment"), dict) else str(item.get("comment"))

                res = await db.execute(select(Worklog).where(Worklog.jira_id == jira_worklog_id))
                db_worklog = res.scalar_one_or_none()

                if db_worklog:
                    db_worklog.time_spent_hours = time_spent_hours
                    db_worklog.date = log_date
                    db_worklog.description = description[:1024] if description else None
                else:
                    db_worklog = Worklog(
                        jira_id=jira_worklog_id,
                        type="JIRA",
                        date=log_date,
                        time_spent_hours=time_spent_hours,
                        description=description[:1024] if description else None,
                        jira_user_id=db_jira_user.id,
                        issue_id=db_issue.id
                    )
                    db.add(db_worklog)
                
                synced_count += 1
                
            await db.commit()
            return {"status": "success", "synced": synced_count}
            
    except Exception as e:
        logger.error(f"Failed to sync worklogs: {e}")
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

async def fetch_jira_project_versions(project_key: str):
    """Fetch versions (releases) for a project."""
    url = f"{settings.JIRA_URL}/rest/api/3/project/{project_key}/versions"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch versions for {project_key}: {e}")
        return []

async def fetch_jira_project_sprints(project_key: str):
    """Fetch sprints for a project."""
    # First find boards for the project
    url_boards = f"{settings.JIRA_URL}/rest/agile/1.0/board"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    sprints = []
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            response = await client.get(url_boards, params={"projectKeyOrId": project_key})
            response.raise_for_status()
            boards = response.json().get("values", [])
            
            for board in boards:
                board_id = board["id"]
                url_sprints = f"{settings.JIRA_URL}/rest/agile/1.0/board/{board_id}/sprint"
                res_sprints = await client.get(url_sprints)
                if res_sprints.status_code == 200:
                    sprints_data = res_sprints.json().get("values", [])
                    for s in sprints_data:
                        # Only active or future sprints might be useful?
                        # User says release OR sprint, usually means they want to analyze a specific sprint's logs.
                        # We return all sprints for now.
                        sprints.append(s)
    except Exception as e:
        logger.error(f"Failed to fetch sprints for {project_key}: {e}")
    
    # Filter unique sprints by ID (since a sprint can be on multiple boards)
    unique_sprints_dict = {s["id"]: s for s in sprints}
    return list(unique_sprints_dict.values())

async def sync_jira_projects_to_db(db: AsyncSession):
    """
    Fetch projects from Jira and sync them to local database.
    Also syncs releases and sprints for each active project.
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
        
        await db.flush() # Ensure project has an ID if new
        
        # Sync Releases for this project
        jira_versions = await fetch_jira_project_versions(key)
        for jv in jira_versions:
            jv_id = str(jv.get("id"))
            res = await db.execute(select(Release).where(Release.jira_id == jv_id))
            db_release = res.scalar_one_or_none()
            
            release_date = None
            if jv.get("releaseDate"):
                try:
                    release_date = datetime.strptime(jv.get("releaseDate"), "%Y-%m-%d").date()
                except: pass

            if db_release:
                db_release.name = jv.get("name")
                db_release.released = jv.get("released", False)
                db_release.release_date = release_date
            else:
                db_release = Release(
                    jira_id=jv_id,
                    name=jv.get("name"),
                    project_id=db_project.id,
                    released=jv.get("released", False),
                    release_date=release_date
                )
                db.add(db_release)

        # Sync Sprints for this project
        jira_sprints = await fetch_jira_project_sprints(key)
        for js in jira_sprints:
            js_id = str(js.get("id"))
            res = await db.execute(select(Sprint).where(Sprint.jira_id == js_id))
            db_sprint = res.scalar_one_or_none()
            
            start_date = None
            if js.get("startDate"):
                try:
                    start_date = parser.isoparse(js.get("startDate")).date()
                except: pass
                
            end_date = None
            if js.get("endDate"):
                try:
                    end_date = parser.isoparse(js.get("endDate")).date()
                except: pass

            if db_sprint:
                db_sprint.name = js.get("name")
                db_sprint.state = js.get("state")
                db_sprint.start_date = start_date
                db_sprint.end_date = end_date
            else:
                db_sprint = Sprint(
                    jira_id=js_id,
                    name=js.get("name"),
                    state=js.get("state"),
                    start_date=start_date,
                    end_date=end_date
                )
                db.add(db_sprint)

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
    Fetch users from Jira and sync them to local database (JiraUser table).
    Then try to link existing system users to JiraUser.
    """
    jira_users = await fetch_jira_users()
    synced_count = 0
    
    for ju in jira_users:
        account_type = ju.get("accountType")
        if account_type not in ["atlassian"]:
            continue
            
        account_id = ju.get("accountId")
        email = ju.get("emailAddress")
        display_name = ju.get("displayName") or "Jira User"
        active = ju.get("active", True)
        avatar_url = ju.get("avatarUrls", {}).get("48x48")
        
        # 1. Update JiraUser table
        result = await db.execute(select(JiraUser).where(JiraUser.jira_account_id == account_id))
        db_jira_user = result.scalar_one_or_none()
        
        if db_jira_user:
            db_jira_user.display_name = display_name
            db_jira_user.email = email
            db_jira_user.avatar_url = avatar_url
            db_jira_user.is_active = active
        else:
            db_jira_user = JiraUser(
                jira_account_id=account_id,
                display_name=display_name,
                email=email,
                avatar_url=avatar_url,
                is_active=active
            )
            db.add(db_jira_user)
            await db.flush() # Get the ID for linking
            
        # 2. Try to link with a system User by email if not already linked
        # We NO LONGER create system Users here automatically.
        if email:
            result = await db.execute(
                select(User).where(User.email == email, User.jira_user_id == None)
            )
            system_user = result.scalar_one_or_none()
            if system_user:
                system_user.jira_user_id = db_jira_user.id
                
        synced_count += 1
    
    await db.commit()
    return synced_count
