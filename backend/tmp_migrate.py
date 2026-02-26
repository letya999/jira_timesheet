
import asyncio
from sqlalchemy import text
from core.database import engine
from core.config import settings

async def migrate():
    print(f"Connecting to {settings.DATABASE_URL}")
    async with engine.begin() as conn:
        try:
            # 1. Add columns if missing
            if "postgresql" in settings.DATABASE_URL:
                await conn.execute(text("ALTER TABLE jira_logs ADD COLUMN IF NOT EXISTS project_key VARCHAR(50);"))
                await conn.execute(text("ALTER TABLE jira_logs ADD COLUMN IF NOT EXISTS summary VARCHAR(1024);"))
                await conn.execute(text("ALTER TABLE jira_logs ADD COLUMN IF NOT EXISTS sprint VARCHAR(255);"))
                await conn.execute(text("ALTER TABLE jira_logs ADD COLUMN IF NOT EXISTS release VARCHAR(255);"))
            
            # 2. Update existing records
            # issue_key is like 'TWPJ-123'
            # In Postgres, using SPLIT_PART or SUBSTRING
            update_sql = "UPDATE jira_logs SET project_key = split_part(issue_key, '-', 1) WHERE project_key IS NULL OR project_key = '';"
            await conn.execute(text(update_sql))
            print("Populated project_key for existing logs.")
            
            print("Migration attempt finished.")
        except Exception as e:
            print(f"Migration error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
