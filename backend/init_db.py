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
import models.settings
import models.category

from sqlalchemy import text

async def init_db():
    print("Creating tables...")
    async with engine.begin() as conn:
        # If PostgreSQL, we can use a nuclear drop to clear FK issues
        if "postgresql" in str(engine.url):
            print("Detected PostgreSQL, dropping schema public...")
            await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
            await conn.execute(text("CREATE SCHEMA public;"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            # Quote username because 'user' is a reserved keyword
            await conn.execute(text(f'GRANT ALL ON SCHEMA public TO "{engine.url.username}";'))
        else:
            await conn.run_sync(Base.metadata.drop_all)
            
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

if __name__ == "__main__":
    asyncio.run(init_db())