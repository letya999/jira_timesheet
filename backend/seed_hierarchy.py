import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from models import Department, Division, JiraUser, Team, User, Worklog
from sqlalchemy import select


async def seed_hierarchy():
    async with async_session() as db:
        # 1. Create Department
        res = await db.execute(select(Department).where(Department.name == "Engineering"))
        dept = res.scalar_one_or_none()
        if not dept:
            dept = Department(name="Engineering")
            db.add(dept)
            await db.flush()

        # 2. Create Division
        res = await db.execute(select(Division).where(Division.name == "Software Development"))
        div = res.scalar_one_or_none()
        if not div:
            div = Division(name="Software Development", department_id=dept.id)
            db.add(div)
            await db.flush()

        # 3. Create Team
        res = await db.execute(select(Team).where(Team.name == "Team One"))
        team = res.scalar_one_or_none()
        if not team:
            team = Team(name="Team One", division_id=div.id)
            db.add(team)
            await db.flush()

        # 4. Assign some Jira users to this team
        res = await db.execute(select(JiraUser).limit(50))
        jira_users = res.scalars().all()
        for ju in jira_users:
            ju.team_id = team.id

        # 5. Link Admin to a Jira User who has worklogs
        res = await db.execute(select(Worklog.jira_user_id).distinct().limit(1))
        ju_id_with_log = res.scalar()

        if ju_id_with_log:
            # Find the JiraUser
            res = await db.execute(select(JiraUser).where(JiraUser.id == ju_id_with_log))
            ju_to_link = res.scalar_one_or_none()

            if ju_to_link:
                res = await db.execute(select(User).where(User.email == "admin@example.com"))
                admin = res.scalar_one_or_none()
                if admin:
                    admin.jira_user_id = ju_to_link.id
                    print(f"Linked admin to Jira User: {ju_to_link.display_name}")

        await db.commit()
        print("Hierarchy created and users assigned.")

if __name__ == "__main__":
    asyncio.run(seed_hierarchy())
