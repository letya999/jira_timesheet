import asyncio
import os
import sys

from sqlalchemy import func, select

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from models import JiraUser, Project, User, Worklog
from models.org import Department, Division, Team


async def check_db():
    async with async_session() as db:
        # Check counts
        users_count = await db.execute(select(func.count()).select_from(User))
        jira_users_count = await db.execute(select(func.count()).select_from(JiraUser))
        worklogs_count = await db.execute(select(func.count()).select_from(Worklog))
        projects_count = await db.execute(select(func.count()).select_from(Project))
        depts_count = await db.execute(select(func.count()).select_from(Department))
        divs_count = await db.execute(select(func.count()).select_from(Division))
        teams_count = await db.execute(select(func.count()).select_from(Team))

        print(f"Users (Login): {users_count.scalar()}")
        print(f"Jira Users (Employees): {jira_users_count.scalar()}")
        print(f"Worklogs: {worklogs_count.scalar()}")
        print(f"Projects: {projects_count.scalar()}")
        print(f"Departments: {depts_count.scalar()}")
        print(f"Divisions: {divs_count.scalar()}")
        print(f"Teams: {teams_count.scalar()}")

if __name__ == "__main__":
    asyncio.run(check_db())
