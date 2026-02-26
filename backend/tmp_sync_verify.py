import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from services.jira import sync_jira_projects_to_db, sync_jira_users_to_db, sync_jira_worklogs

async def full_sync():
    async with async_session() as db:
        print("Syncing users...")
        users = await sync_jira_users_to_db(db)
        print(f"Synced {users} users.")
        
        print("Syncing projects, releases, sprints...")
        projects = await sync_jira_projects_to_db(db)
        print(f"Synced {projects} projects.")
        
        print("Syncing worklogs...")
        worklogs = await sync_jira_worklogs(db)
        print(f"Worklog sync result: {worklogs}")

if __name__ == "__main__":
    asyncio.run(full_sync())
