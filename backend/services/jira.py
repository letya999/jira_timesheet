import logging
from datetime import datetime
from typing import Any

import httpx
from core.config import settings
from dateutil import parser
from models import Issue, JiraUser, Project, Release, Sprint, User, Worklog, WorklogCategory
from models.project import issue_releases
from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def fetch_issue_details(issue_ids: list[str]):
    """Fetch issue keys and project keys for a list of issue IDs."""
    if not issue_ids:
        return {}

    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    url = f"{settings.JIRA_URL}/rest/api/3/search/jql"

    mapping = {}
    batch_size = 100

    try:
        async with httpx.AsyncClient(auth=auth) as client:
            for i in range(0, len(issue_ids), batch_size):
                batch = issue_ids[i : i + batch_size]
                ids_str = ",".join(batch)
                jql = f"id in ({ids_str})"

                payload = {
                    "jql": jql,
                    "fields": ["key", "project", "fixVersions", "status", "issuetype", "summary", "parent"],
                    "maxResults": batch_size,
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
                        "releases": [{"id": v["id"], "name": v["name"]} for v in versions],
                    }
        return mapping
    except Exception as e:
        logger.error(f"Failed to fetch issue details: {e}")
        return mapping


async def sync_user_worklogs(jira_user, db: AsyncSession, days: int = 30):
    """Sync worklogs for a specific Jira user over the last N days."""
    import time

    since_ms = int((time.time() - (days * 24 * 3600)) * 1000)
    logger.info(f"Triggering sync for user {jira_user.display_name} since {days} days ago")
    return await sync_jira_worklogs(db, since=since_ms)


async def get_default_category_id(db: AsyncSession) -> int:
    """Gets or creates the default 'Development' category."""
    res = await db.execute(select(WorklogCategory).where(WorklogCategory.name == "Development"))
    cat = res.scalar_one_or_none()
    if not cat:
        cat = WorklogCategory(name="Development", is_active=True)
        db.add(cat)
        await db.flush()
    return cat.id


def _extract_jira_comment(raw_comment: Any) -> str:
    """Extract text from Jira ADF or string comment."""
    if not raw_comment:
        return ""
    if isinstance(raw_comment, dict):
        try:
            # Jira ADF format: content -> content -> text
            content = raw_comment.get("content", [{}])[0].get("content", [{}])[0]
            return content.get("text", "")
        except (IndexError, AttributeError):
            return ""
    return str(raw_comment)


async def _ensure_entities_exist(db: AsyncSession, item: dict, iss_data: dict):
    """Ensures JiraUser, Project, and Issue exist in DB."""
    author_id = item.get("author", {}).get("accountId")
    issue_id_jira = item.get("issueId")

    # JiraUser
    res_u = await db.execute(select(JiraUser).where(JiraUser.jira_account_id == author_id))
    db_jira_user = res_u.scalar_one_or_none()
    if not db_jira_user:
        db_jira_user = JiraUser(
            jira_account_id=author_id, display_name=item.get("author", {}).get("displayName") or "Unknown"
        )
        db.add(db_jira_user)
        await db.flush()

    # Project
    res_p = await db.execute(select(Project).where(Project.jira_id == str(iss_data["project_id"])))
    db_project = res_p.scalar_one_or_none()
    if not db_project:
        db_project = Project(
            jira_id=str(iss_data["project_id"]), key=iss_data["project_key"], name=iss_data["project_name"]
        )
        db.add(db_project)
        await db.flush()

    # Issue
    res_i = await db.execute(select(Issue).where(Issue.jira_id == issue_id_jira))
    db_issue = res_i.scalar_one_or_none()
    if not db_issue:
        db_issue = Issue(
            jira_id=issue_id_jira,
            key=iss_data["key"],
            summary=iss_data["summary"] or "No summary",
            status=iss_data["status"],
            issue_type=iss_data["issue_type"],
            project_id=db_project.id,
        )
        db.add(db_issue)
        await db.flush()
    else:
        db_issue.summary = iss_data["summary"] or db_issue.summary
        db_issue.status = iss_data["status"] or db_issue.status

    return db_jira_user, db_project, db_issue


async def _update_issue_releases(db: AsyncSession, db_issue: Issue, db_project: Project, iss_data: dict):
    """Updates release mappings for an issue."""
    if "releases" in iss_data and iss_data["releases"]:
        await db.execute(delete(issue_releases).where(issue_releases.c.issue_id == db_issue.id))
        rel_ids = []
        for r_info in iss_data["releases"]:
            rj_id = str(r_info["id"])
            r_res = await db.execute(select(Release).where(Release.jira_id == rj_id))
            db_rel = r_res.scalar_one_or_none()
            if not db_rel:
                db_rel = Release(jira_id=rj_id, name=r_info["name"], project_id=db_project.id)
                db.add(db_rel)
                await db.flush()
            rel_ids.append(db_rel.id)
        if rel_ids:
            await db.execute(insert(issue_releases), [{"issue_id": db_issue.id, "release_id": rid} for rid in rel_ids])


async def sync_jira_worklogs(db: AsyncSession, since: int = 0):
    """Sync worklogs from Jira Cloud API to the new Worklog model."""
    url_updated = f"{settings.JIRA_URL}/rest/api/3/worklog/updated"
    url_list = f"{settings.JIRA_URL}/rest/api/3/worklog/list"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)

    try:
        async with httpx.AsyncClient(auth=auth) as client:
            resp = await client.get(url_updated, params={"since": since})
            resp.raise_for_status()
            worklog_ids = [item["worklogId"] for item in resp.json().get("values", [])]
            if not worklog_ids:
                return {"status": "success", "synced": 0}

            resp_details = await client.post(url_list, json={"ids": worklog_ids[:1000]})
            resp_details.raise_for_status()
            worklogs_data = resp_details.json()

            issue_ids = list(set([it.get("issueId") for it in worklogs_data if it.get("issueId")]))
            issue_mapping = await fetch_issue_details(issue_ids)
            default_cat_id = await get_default_category_id(db)

            synced_count = 0
            for item in worklogs_data:
                if not item.get("author", {}).get("accountId") or not item.get("issueId"):
                    continue
                iss_data = issue_mapping.get(item.get("issueId"))
                if not iss_data:
                    continue

                db_j_user, db_proj, db_iss = await _ensure_entities_exist(db, item, iss_data)
                await _update_issue_releases(db, db_iss, db_proj, iss_data)

                jw_id = str(item.get("id"))
                hours = item.get("timeSpentSeconds", 0) / 3600.0
                l_date = parser.isoparse(item.get("started")).date()
                s_created = parser.isoparse(item.get("created")).replace(tzinfo=None)
                desc = _extract_jira_comment(item.get("comment", {}))

                res = await db.execute(select(Worklog).where(Worklog.jira_id == jw_id))
                db_w = res.scalar_one_or_none()
                if db_w:
                    db_w.hours, db_w.date, db_w.description = hours, l_date, desc[:1024] if desc else None
                    db_w.source_created_at, db_w.category_id = s_created, default_cat_id
                else:
                    db.add(
                        Worklog(
                            jira_id=jw_id,
                            type="JIRA",
                            category_id=default_cat_id,
                            date=l_date,
                            hours=hours,
                            description=desc[:1024] if desc else None,
                            jira_user_id=db_j_user.id,
                            issue_id=db_iss.id,
                            source_created_at=s_created,
                        )
                    )
                synced_count += 1

            await db.commit()
            return {"status": "success", "synced": synced_count}
    except Exception as e:
        logger.error(f"Failed to sync worklogs: {e}")
        return {"status": "error", "detail": str(e)}


async def fetch_jira_projects():
    """Fetch all projects from Jira Cloud API."""
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
    url_boards = f"{settings.JIRA_URL}/rest/agile/1.0/board"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    sprints = []
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            response = await client.get(url_boards, params={"projectKeyOrId": project_key})
            response.raise_for_status()
            boards = response.json().get("values", [])
            for board in boards:
                res_s = await client.get(f"{settings.JIRA_URL}/rest/agile/1.0/board/{board['id']}/sprint")
                if res_s.status_code == 200:
                    sprints.extend(res_s.json().get("values", []))
    except Exception as e:
        logger.error(f"Failed to fetch sprints for {project_key}: {e}")
    unique_sprints = {s["id"]: s for s in sprints}
    return list(unique_sprints.values())


async def sync_jira_projects_to_db(db: AsyncSession):
    """Fetch projects, releases, and sprints from Jira and sync to local DB."""
    jira_projects = await fetch_jira_projects()
    synced_count = 0
    for jp in jira_projects:
        j_id, key, name = str(jp.get("id")), jp.get("key"), jp.get("name")
        res = await db.execute(select(Project).where(Project.jira_id == j_id))
        db_p = res.scalar_one_or_none()
        if db_p:
            db_p.key, db_p.name = key, name
        else:
            db_p = Project(jira_id=j_id, key=key, name=name, is_active=False)
            db.add(db_p)
        await db.flush()

        for jv in await fetch_jira_project_versions(key):
            jv_id = str(jv.get("id"))
            r_res = await db.execute(select(Release).where(Release.jira_id == jv_id))
            db_rel = r_res.scalar_one_or_none()
            r_date = None
            if jv.get("releaseDate"):
                try:
                    r_date = datetime.strptime(jv.get("releaseDate"), "%Y-%m-%d").date()
                except Exception:
                    pass
            if db_rel:
                db_rel.name, db_rel.released, db_rel.release_date = jv.get("name"), jv.get("released", False), r_date
            else:
                db.add(
                    Release(
                        jira_id=jv_id,
                        name=jv.get("name"),
                        project_id=db_p.id,
                        released=jv.get("released", False),
                        release_date=r_date,
                    )
                )

        for js in await fetch_jira_project_sprints(key):
            js_id = str(js.get("id"))
            s_res = await db.execute(select(Sprint).where(Sprint.jira_id == js_id))
            db_s = s_res.scalar_one_or_none()
            st_d = parser.isoparse(js.get("startDate")).date() if js.get("startDate") else None
            en_d = parser.isoparse(js.get("endDate")).date() if js.get("endDate") else None
            if db_s:
                db_s.name = js.get("name")
                db_s.state = js.get("state")
                db_s.start_date = st_d
                db_s.end_date = en_d
            else:
                db.add(
                    Sprint(
                        jira_id=js_id,
                        name=js.get("name"),
                        state=js.get("state"),
                        start_date=st_d,
                        end_date=en_d,
                    )
                )
        synced_count += 1
    await db.commit()
    return synced_count


async def sync_jira_worklogs_for_projects(db: AsyncSession, project_keys: list[str] = None, since: int = 0):
    """Sync worklogs for projects (placeholder for targeted sync)."""
    return await sync_jira_worklogs(db, since)


async def fetch_jira_users():
    """Fetch all users from Jira Cloud API with pagination."""
    users, start_at, max_results = [], 0, 50
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    logger.info(f"Using JIRA_URL: {settings.JIRA_URL}")
    try:
        async with httpx.AsyncClient(auth=auth) as client:
            while start_at < 1000:
                url = f"{settings.JIRA_URL}/rest/api/3/users/search"
                resp = await client.get(url, params={"startAt": start_at, "maxResults": max_results})
                resp.raise_for_status()
                data = resp.json()
                if not data:
                    break
                users.extend(data)
                if len(data) < max_results:
                    break
                start_at += max_results
            return users
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch Jira users: {e}")
        return []


async def sync_jira_users_to_db(db: AsyncSession):
    """Sync users from Jira to local DB and link existing system users."""
    jira_users = await fetch_jira_users()
    synced_count = 0
    for ju in jira_users:
        if ju.get("accountType") != "atlassian":
            continue
        acc_id, email, d_name = ju.get("accountId"), ju.get("emailAddress"), ju.get("displayName") or "Jira User"
        active, avatar = ju.get("active", True), ju.get("avatarUrls", {}).get("48x48")
        res = await db.execute(select(JiraUser).where(JiraUser.jira_account_id == acc_id))
        db_ju = res.scalar_one_or_none()
        if db_ju:
            db_ju.display_name = d_name
            db_ju.email = email
            db_ju.avatar_url = avatar
            db_ju.is_active = active
        else:
            db_ju = JiraUser(
                jira_account_id=acc_id,
                display_name=d_name,
                email=email,
                avatar_url=avatar,
                is_active=active,
            )
            db.add(db_ju)
            await db.flush()
        if email:
            res_s = await db.execute(select(User).where(User.email == email, User.jira_user_id.is_(None)))
            system_user = res_s.scalar_one_or_none()
            if system_user:
                system_user.jira_user_id = db_ju.id
        synced_count += 1
    await db.commit()
    return synced_count
