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
        admin = result.scalar_one_or_none()
        
        if admin:
            print("Admin user already exists. Ensuring Admin role...")
            admin.role = "Admin"
            await session.commit()
            return

        print("Creating admin user...")
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            full_name="System Admin",
            role="Admin"
        )
        session.add(admin)
        await session.commit()
        print("Admin user created: admin@example.com / admin123")

if __name__ == "__main__":
    asyncio.run(seed_admin())
