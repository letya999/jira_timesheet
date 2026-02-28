import asyncio
import sys
import os

# Ensure the parent directory is in the path so we can import models/core
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from core.security import get_password_hash
from models import User, JiraUser, Department, Division, Team, Worklog, WorklogCategory
from datetime import date

async def setup():
    async with async_session() as session:
        print("--- Starting Test Org Setup ---")
        
        # 1. Departments
        dept1 = Department(name="Test Dept 1 (Engineering)")
        dept2 = Department(name="Test Dept 2 (Product)")
        session.add_all([dept1, dept2])
        await session.flush()
        print(f"Created Departments: {dept1.name}, {dept2.name}")

        # 2. Divisions
        div1 = Division(name="Test Division 1 (Backend)", department_id=dept1.id)
        div2 = Division(name="Test Division 2 (UI/UX)", department_id=dept2.id)
        session.add_all([div1, div2])
        await session.flush()
        print(f"Created Divisions: {div1.name}, {div2.name}")

        # 3. PM Users
        pm1_login = User(
            email="test_pm1@example.com",
            hashed_password=get_password_hash("testpass"),
            full_name="Test PM One",
            role="PM"
        )
        pm2_login = User(
            email="test_pm2@example.com",
            hashed_password=get_password_hash("testpass"),
            full_name="Test PM Two",
            role="PM"
        )
        session.add_all([pm1_login, pm2_login])
        await session.flush()
        print(f"Created PM Users: {pm1_login.email}, {pm2_login.email}")

        # 4. Teams
        team1 = Team(name="Test Team Alpha", division_id=div1.id, pm_id=pm1_login.id)
        team2 = Team(name="Test Team Beta", division_id=div2.id, pm_id=pm2_login.id)
        session.add_all([team1, team2])
        await session.flush()
        print(f"Created Teams: {team1.name}, {team2.name}")

        # 5. Employees
        # Helper to create Employee + JiraUser
        async def create_employee(email, name, team_id, jira_id):
            juser = JiraUser(
                jira_account_id=jira_id,
                display_name=name,
                team_id=team_id,
                is_active=True
            )
            session.add(juser)
            await session.flush()
            
            login = User(
                email=email,
                hashed_password=get_password_hash("testpass"),
                full_name=name,
                role="Employee",
                jira_user_id=juser.id
            )
            session.add(login)
            return login, juser

        # Team 1 Employees
        emp1_1, ju1_1 = await create_employee("test_emp1_1@example.com", "Employee 1-1", team1.id, "jira_test_1_1")
        emp1_2, ju1_2 = await create_employee("test_emp1_2@example.com", "Employee 1-2", team1.id, "jira_test_1_2")
        
        # Team 2 Employees
        emp2_1, ju2_1 = await create_employee("test_emp2_1@example.com", "Employee 2-1", team2.id, "jira_test_2_1")
        emp2_2, ju2_2 = await create_employee("test_emp2_2@example.com", "Employee 2-2", team2.id, "jira_test_2_2")
        
        await session.flush()
        print("Created 4 Employees and their Jira links.")

        # 6. Some sample Worklogs for them
        # Get or create category
        from sqlalchemy import select
        res = await session.execute(select(WorklogCategory).where(WorklogCategory.name == "Development"))
        cat = res.scalar_one_or_none()
        if not cat:
            cat = WorklogCategory(name="Development")
            session.add(cat)
            await session.flush()

        w1 = Worklog(date=date.today(), hours=4.5, jira_user_id=ju1_1.id, category_id=cat.id, description="Test worklog")
        w2 = Worklog(date=date.today(), hours=8.0, jira_user_id=ju2_1.id, category_id=cat.id, description="Test worklog 2")
        session.add_all([w1, w2])

        await session.commit()
        print("--- Setup Complete! ---")

if __name__ == "__main__":
    asyncio.run(setup())
