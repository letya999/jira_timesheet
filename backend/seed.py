import asyncio
import os
import sys

# Add the current directory to sys.path so we can import core and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from core.security import get_password_hash
from models import User
from sqlalchemy import select

async def seed_admin():
    async with async_session() as session:
        # Check if admin already exists
        result = await session.execute(select(User).where(User.email == "admin@example.com"))
        if result.scalar_one_or_none():
            print("Admin user already exists.")
            return

        print("Creating admin user...")
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="System Admin",
            role="Admin",
            weekly_quota=40
        )
        session.add(admin)
        await session.commit()
        print("Admin user created: admin@example.com / admin123")

if __name__ == "__main__":
    asyncio.run(seed_admin())
