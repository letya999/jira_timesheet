
import asyncio

from core.database import async_session
from services.jira import sync_jira_users_to_db


async def force_user_sync():
    async with async_session() as db:
        print("Starting user sync...")
        count = await sync_jira_users_to_db(db)
        print(f"Sync complete. Synced {count} users.")

if __name__ == "__main__":
    asyncio.run(force_user_sync())
