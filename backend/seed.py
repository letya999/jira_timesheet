import asyncio
import os
import sys

# Add the current directory to sys.path so we can import core and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from core.security import get_password_hash
from models import User, Role, OrgUnit
from sqlalchemy import select

async def seed():
    async with async_session() as session:
        # 1. Seed Roles
        system_roles = ["Admin", "PM", "CEO", "Team Lead", "Employee"]
        for role_name in system_roles:
            res = await session.execute(select(Role).where(Role.name == role_name))
            if not res.scalar_one_or_none():
                session.add(Role(name=role_name, is_system=True))
        
        await session.flush()

        # 2. Seed Root OrgUnit
        res = await session.execute(select(OrgUnit).where(OrgUnit.parent_id == None))
        root_unit = res.scalar_one_or_none()
        if not root_unit:
            root_unit = OrgUnit(name="Main Organization", reporting_period="weekly")
            session.add(root_unit)
            await session.flush()

        # 3. Seed Admin User
        result = await session.execute(select(User).where(User.email == "admin@example.com"))
        admin = result.scalar_one_or_none()

        if not admin:
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
        else:
            print("Admin user already exists.")
            admin.role = "Admin"
            await session.commit()

if __name__ == "__main__":
    asyncio.run(seed())
