
import asyncio

from backend.core.database import async_session
from backend.services.jira import sync_jira_projects_to_db, sync_jira_worklogs


async def run_sync():
    async with async_session() as session:
        print("Syncing projects and releases...")
        p_count = await sync_jira_projects_to_db(session)
        print(f"Synced {p_count} projects.")

        print("Syncing worklogs and linking issues to releases...")
        # since=0 means full sync from beginning of time or whatever 'since' logic does
        # In jira.py, sync_jira_worklogs(since=0) calls /rest/api/3/worklog/updated?since=0
        # which returns worklogs updated in the last 24 hours if since is too old, or something.
        # Actually Jira API 'since' is a unix timestamp. 0 means all available?
        res = await sync_jira_worklogs(session, since=0)
        print(f"Sync result: {res}")

if __name__ == "__main__":
    asyncio.run(run_sync())
