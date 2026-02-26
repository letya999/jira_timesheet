
import asyncio
from sqlalchemy import select
from core.database import async_session
from models.user import User

async def check_users():
    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Users in DB: {len(users)}")
        for u in users:
            print(f"  - ID: {u.id}, Email: {u.email}, JiraAccountID: {u.jira_account_id}")

if __name__ == "__main__":
    asyncio.run(check_users())
