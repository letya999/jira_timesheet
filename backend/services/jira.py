import logging
import re
import time
from datetime import datetime
from typing import Any

import httpx
from core.config import settings
from crud.settings import system_settings
from dateutil import parser
from models import Issue, IssueType, JiraUser, Project, Release, Sprint, User, Worklog, WorklogCategory
from models.project import issue_releases, issue_sprints
from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


def _parse_jira_sprints(sprints_data: Any) -> list[dict[str, str]]:
    """Parse sprint data from Jira, handling both dict and string formats."""
    if not sprints_data or not isinstance(sprints_data, list):
        return []

    parsed = []
    for s in sprints_data:
        if isinstance(s, dict):
            if "id" in s and "name" in s:
                parsed.append({"id": str(s["id"]), "name": s["name"]})
        elif isinstance(s, str):
            # Sprint string format: "com.atlassian.greenhopper.service.sprint.Sprint@...[id=1,name=Sprint 1,...]"
            id_match = re.search(r"id=(\d+)", s)
            name_match = re.search(r"name=([^,\]]+)", s)
            if id_match and name_match:
                parsed.append({"id": id_match.group(1), "name": name_match.group(1)})
    return parsed


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
                    "fields": [
                        "key",
                        "project",
                        "fixVersions",
                        "status",
                        "issuetype",
                        "summary",
                        "parent",
                        "customfield_10020",
                    ],
                    "maxResults": batch_size,
                }

                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

                for issue in data.get("issues", []):
                    fields = issue.get("fields", {})
                    versions = fields.get("fixVersions", [])
                    sprints_raw = fields.get("customfield_10020")

                    mapping[issue["id"]] = {
                        "jira_id": issue["id"],
                        "key": issue["key"],
                        "project_id": fields["project"]["id"],
                        "project_key": fields["project"]["key"],
                        "project_name": fields["project"]["name"],
                        "summary": fields.get("summary"),
                        "status": fields.get("status", {}).get("name"),
                        "issue_type_name": fields.get("issuetype", {}).get("name"),
                        "issue_type_id": fields.get("issuetype", {}).get("id"),
                        "issue_type_icon": fields.get("issuetype", {}).get("iconUrl"),
                        "issue_type_subtask": fields.get("issuetype", {}).get("subtask", False),
                        "parent_id": fields.get("parent", {}).get("id"),
                        "releases": [{"id": v["id"], "name": v["name"]} for v in versions],
                        "sprints": _parse_jira_sprints(sprints_raw),
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
    """Ensures JiraUser, Project, and Issue exist in DB.

    Returns None if the project is not found in DB (caller must skip the worklog).
    Projects are never auto-created here — they must exist via sync_jira_projects_to_db.
    """
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

    # Project — never auto-create; if not in DB, caller skips the worklog
    res_p = await db.execute(select(Project).where(Project.jira_id == str(iss_data["project_id"])))
    db_project = res_p.scalar_one_or_none()
    if not db_project:
        logger.debug(f"Project jira_id={iss_data['project_id']} not in DB, skipping worklog")
        return None

    # IssueType
    db_issue_type = None
    if "issue_type_id" in iss_data:
        res_it = await db.execute(select(IssueType).where(IssueType.jira_id == str(iss_data["issue_type_id"])))
        db_issue_type = res_it.scalar_one_or_none()
        if not db_issue_type:
            db_issue_type = IssueType(
                jira_id=str(iss_data["issue_type_id"]),
                name=iss_data.get("issue_type_name") or "Unknown",
                icon_url=iss_data.get("issue_type_icon"),
                is_subtask=iss_data.get("issue_type_subtask", False),
            )
            db.add(db_issue_type)
            await db.flush()
        else:
            # Update icon if changed
            if db_issue_type.icon_url != iss_data.get("issue_type_icon"):
                db_issue_type.icon_url = iss_data.get("issue_type_icon")
                db_issue_type.name = iss_data.get("issue_type_name") or db_issue_type.name

    # Issue
    res_i = await db.execute(select(Issue).where(Issue.jira_id == issue_id_jira))
    db_issue = res_i.scalar_one_or_none()
    if not db_issue:
        db_issue = Issue(
            jira_id=issue_id_jira,
            key=iss_data["key"],
            summary=iss_data["summary"] or "No summary",
            status=iss_data["status"],
            issue_type=iss_data.get("issue_type_name"),
            issue_type_id=db_issue_type.id if db_issue_type else None,
            project_id=db_project.id,
        )
        db.add(db_issue)
        await db.flush()
    else:
        db_issue.summary = iss_data["summary"] or db_issue.summary
        db_issue.status = iss_data["status"] or db_issue.status
        if db_issue_type:
            db_issue.issue_type_id = db_issue_type.id
            db_issue.issue_type = iss_data.get("issue_type_name") or db_issue.issue_type

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


async def _update_issue_sprints(db: AsyncSession, db_issue: Issue, iss_data: dict):
    """Updates sprint mappings for an issue."""
    if "sprints" in iss_data and iss_data["sprints"]:
        await db.execute(delete(issue_sprints).where(issue_sprints.c.issue_id == db_issue.id))
        sprint_ids = []
        for s_info in iss_data["sprints"]:
            sj_id = str(s_info["id"])
            s_res = await db.execute(select(Sprint).where(Sprint.jira_id == sj_id))
            db_sprint = s_res.scalar_one_or_none()
            if not db_sprint:
                db_sprint = Sprint(jira_id=sj_id, name=s_info["name"])
                db.add(db_sprint)
                await db.flush()
            sprint_ids.append(db_sprint.id)
        if sprint_ids:
            await db.execute(insert(issue_sprints), [{"issue_id": db_issue.id, "sprint_id": sid} for sid in sprint_ids])


async def sync_specific_worklogs(db: AsyncSession, worklog_ids: list[str]):
    """Sync specific worklogs by their Jira IDs."""
    if not worklog_ids:
        return {"status": "success", "synced": 0}

    url_list = f"{settings.JIRA_URL}/rest/api/3/worklog/list"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)

    try:
        async with httpx.AsyncClient(auth=auth) as client:
            resp_details = await client.post(url_list, json={"ids": [int(wid) for wid in worklog_ids]})
            resp_details.raise_for_status()
            worklogs_data = resp_details.json()

            issue_ids = list(set([it.get("issueId") for it in worklogs_data if it.get("issueId")]))
            issue_mapping = await fetch_issue_details(issue_ids)
            default_cat_id = await get_default_category_id(db)

            synced_count = 0
            for item in worklogs_data:
                iss_id = item.get("issueId")
                if not item.get("author", {}).get("accountId") or not iss_id:
                    continue
                iss_data = issue_mapping.get(iss_id)
                if not iss_data:
                    continue

                db_j_user, db_proj, db_iss = await _ensure_entities_exist(db, item, iss_data)
                await _update_issue_releases(db, db_iss, db_proj, iss_data)
                await _update_issue_sprints(db, db_iss, iss_data)

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
        logger.error(f"Failed to sync specific worklogs: {e}")
        return {"status": "error", "detail": str(e)}


async def sync_jira_worklogs(
    db: AsyncSession,
    since: int | None = None,
    project_id: str | None = None,
    allowed_project_jira_ids: set[str] | None = None,
):
    """Sync worklogs from Jira Cloud API with filtering to active projects only.

    The Jira /worklog/updated endpoint returns all worklogs instance-wide — there is no
    per-project filter in the API. Filtering is done post-fetch against the allowed set.

    Pagination: /worklog/updated returns up to 1000 IDs per page. We iterate until
    lastPage=true, processing each page and committing progress so a mid-run failure
    does not reprocess previously synced worklogs.

    Args:
        project_id: Jira project jira_id string — restricts sync to this single project.
        allowed_project_jira_ids: explicit set of Jira project IDs to include.
            If neither argument is given, all is_active=True projects are used.
    """
    sync_key = "last_jira_worklog_sync" if project_id is None else f"last_jira_worklog_sync_proj_{project_id}"

    if since is None:
        last_sync_obj = await system_settings.get(db, sync_key)
        if last_sync_obj:
            since = last_sync_obj.value.get("timestamp", 0)
        else:
            if project_id is not None:
                global_sync = await system_settings.get(db, "last_jira_worklog_sync")
                since = global_sync.value.get("timestamp", 0) if global_sync else 0
            else:
                since = 0

    # Build the whitelist of Jira project IDs allowed to be synced
    if project_id is not None:
        active_jira_ids: set[str] = {str(project_id)}
    elif allowed_project_jira_ids is not None:
        active_jira_ids = {str(x) for x in allowed_project_jira_ids}
    else:
        # Fallback: load all is_active=True projects from DB
        res_active = await db.execute(select(Project).where(Project.is_active == True))
        active_jira_ids = {str(p.jira_id) for p in res_active.scalars().all()}

    if not active_jira_ids:
        logger.info("sync_jira_worklogs: no active projects in whitelist, skipping")
        return {"status": "success", "synced": 0}

    url_updated = f"{settings.JIRA_URL}/rest/api/3/worklog/updated"
    url_list = f"{settings.JIRA_URL}/rest/api/3/worklog/list"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)

    total_synced = 0
    current_since = since

    try:
        default_cat_id = await get_default_category_id(db)

        async with httpx.AsyncClient(auth=auth, timeout=60.0) as client:
            # Paginate through /worklog/updated (up to 1000 IDs per page)
            while True:
                resp = await client.get(url_updated, params={"since": current_since})
                resp.raise_for_status()
                page_data = resp.json()

                worklog_ids = [item["worklogId"] for item in page_data.get("values", [])]
                page_until: int = page_data.get("until", int(time.time() * 1000))
                is_last_page: bool = page_data.get("lastPage", True)

                if not worklog_ids:
                    # No worklogs on this page — save timestamp and stop
                    await system_settings.set(db, sync_key, {"timestamp": page_until})
                    await db.commit()
                    break

                # Fetch full worklog details for this page (max 1000 per request)
                resp_details = await client.post(url_list, json={"ids": worklog_ids})
                resp_details.raise_for_status()
                worklogs_data = resp_details.json()

                issue_ids = list({it.get("issueId") for it in worklogs_data if it.get("issueId")})
                issue_mapping = await fetch_issue_details(issue_ids)

                page_synced = 0
                for item in worklogs_data:
                    if not item.get("author", {}).get("accountId") or not item.get("issueId"):
                        continue
                    iss_data = issue_mapping.get(item.get("issueId"))
                    if not iss_data:
                        continue

                    # Post-filter: skip worklogs from projects outside the whitelist
                    if str(iss_data["project_id"]) not in active_jira_ids:
                        continue

                    entities = await _ensure_entities_exist(db, item, iss_data)
                    if entities is None:
                        continue
                    db_j_user, db_proj, db_iss = entities
                    await _update_issue_releases(db, db_iss, db_proj, iss_data)
                    await _update_issue_sprints(db, db_iss, iss_data)

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
                    page_synced += 1

                # Save progress after each page so a crash doesn't reprocess it
                await system_settings.set(db, sync_key, {"timestamp": page_until})
                await db.commit()
                total_synced += page_synced
                logger.info(f"sync_jira_worklogs: page synced={page_synced}, total={total_synced}, until={page_until}")

                if is_last_page:
                    break
                current_since = page_until

        return {"status": "success", "synced": total_synced}
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


async def sync_jira_projects_to_db(db: AsyncSession, only_keys: list[str] = None):
    """Fetch projects, releases, and sprints from Jira and sync to local DB."""
    jira_projects = await fetch_jira_projects()
    synced_count = 0
    for jp in jira_projects:
        key = jp.get("key")

        # If filtering is enabled, skip projects not in the active list
        if only_keys is not None and key not in only_keys:
            continue

        j_id, name = str(jp.get("id")), jp.get("name")
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
    """Sync worklogs filtered to the given project keys (or all active projects if none given).

    Jira /worklog/updated has no per-project filter — we post-filter by project after fetching.
    """
    if project_keys and len(project_keys) == 1:
        res = await db.execute(select(Project).where(Project.key == project_keys[0]))
        p = res.scalar_one_or_none()
        if p:
            return await sync_jira_worklogs(db, project_id=p.jira_id)
        return {"status": "error", "message": f"Project key {project_keys[0]} not found in DB"}

    if project_keys:
        # Multiple explicit keys — build whitelist from DB
        res = await db.execute(select(Project).where(Project.key.in_(project_keys)))
        projects = res.scalars().all()
        allowed_ids = {str(p.jira_id) for p in projects}
        return await sync_jira_worklogs(db, since=since, allowed_project_jira_ids=allowed_ids)

    # No keys — sync all active projects (whitelist built inside sync_jira_worklogs)
    return await sync_jira_worklogs(db, since=since)


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
