import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from services.jira import sync_jira_users_to_db, sync_jira_worklogs

async def main():
    async with async_session() as db:
        print("Синхронизация пользователей из Jira...")
        await sync_jira_users_to_db(db)
        print("Синхронизация ворклогов за последние 30 дней...")
        # since=0 подтянет то, что разрешит Jira по умолчанию или за период
        await sync_jira_worklogs(db)
        print("Готово!")

if __name__ == "__main__":
    asyncio.run(main())
