import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import engine
from models.base import Base
import models.user
import models.org
import models.timesheet
import models.project

async def init_db():
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

if __name__ == "__main__":
    asyncio.run(init_db())