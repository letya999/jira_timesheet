
import asyncio
from sqlalchemy import select
from core.database import async_session
from models.timesheet import JiraLog
from models.project import Project

async def check_db():
    async with async_session() as session:
        # Check projects
        result = await session.execute(select(Project))
        projects = result.scalars().all()
        print(f"Projects in DB: {len(projects)}")
        for p in projects:
            print(f"  - ID: {p.id}, Key: {p.key}, Name: {p.name}, Active: {p.is_active}")

        # Check logs
        result = await session.execute(select(JiraLog).limit(10))
        logs = result.scalars().all()
        print(f"\nJira logs in DB (first 10): {len(logs)}")
        for l in logs:
            print(f"  - ID: {l.id}, AccountID: {l.jira_account_id}, Date: {l.date}, IssueKey: {l.issue_key}, ProjectKey: {l.project_key}")

if __name__ == "__main__":
    asyncio.run(check_db())
