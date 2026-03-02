import asyncio
import os
import sys

# Add the current directory to sys.path so we can import core and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import httpx
from core.config import settings
from core.database import async_session
from models import Project


async def fetch_projects():
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    url = f"{settings.JIRA_URL}/rest/api/3/project"
    async with httpx.AsyncClient(auth=auth) as client:
        response = await client.get(url)
        return response.json()

async def sync_projects():
    print("Fetching projects from Jira...")
    projects_data = await fetch_projects()

    async with async_session() as db:
        for p_data in projects_data:
            from sqlalchemy import select
            res = await db.execute(select(Project).where(Project.jira_id == p_data["id"]))
            project = res.scalar_one_or_none()

            if project:
                project.name = p_data["name"]
                project.key = p_data["key"]
            else:
                project = Project(
                    jira_id=p_data["id"],
                    key=p_data["key"],
                    name=p_data["name"],
                    is_active=True # Activate by default for testing
                )
                db.add(project)

        await db.commit()
        print(f"Synced {len(projects_data)} projects.")

if __name__ == "__main__":
    asyncio.run(sync_projects())
