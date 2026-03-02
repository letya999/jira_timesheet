import asyncio

from core.database import async_session
from services.jira import sync_jira_projects_to_db


async def force_sync():
    async with async_session() as db:
        print("Starting project sync...")
        count = await sync_jira_projects_to_db(db)
        print(f"Sync complete. Synced {count} projects.")

if __name__ == "__main__":
    asyncio.run(force_sync())
