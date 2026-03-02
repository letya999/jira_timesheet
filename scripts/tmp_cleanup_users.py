
import asyncio

from core.database import async_session
from models.user import User
from sqlalchemy import delete


async def cleanup():
    async with async_session() as session:
        # Delete all users except admin@example.com
        stmt = delete(User).where(User.email != "admin@example.com")
        result = await session.execute(stmt)
        await session.commit()
        print(f"Deleted {result.rowcount} accidental users.")

if __name__ == "__main__":
    asyncio.run(cleanup())
