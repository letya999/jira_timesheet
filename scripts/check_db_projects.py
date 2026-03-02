
import asyncio

from sqlalchemy import func, select

from backend.core.database import SessionLocal
from backend.models.project import Project


async def check_projects():
    async with SessionLocal() as db:
        result = await db.execute(select(func.count(Project.id)))
        count = result.scalar()
        print(f"Total projects in DB: {count}")

        result = await db.execute(select(Project).limit(5))
        projects = result.scalars().all()
        for p in projects:
            print(f" - {p.key}: {p.name} (Active: {p.is_active})")

if __name__ == "__main__":
    import os
    import sys
    # Add backend to path
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    asyncio.run(check_projects())
