import asyncio
from sqlalchemy import select
from core.database import async_session
from models.user import User

async def run():
    async with async_session() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.email}, Hash: {u.hashed_password}")

asyncio.run(run())
