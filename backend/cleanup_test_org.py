import asyncio
import sys
import os
from sqlalchemy import select, delete

# Ensure the parent directory is in the path so we can import models/core
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from models import User, JiraUser, Department, Division, Team, Worklog, TimesheetPeriod

async def cleanup():
    async with async_session() as session:
        print("--- Starting Test Org Cleanup ---")
        
        # 1. Identify users to delete
        # We'll use the email prefix 'test_' or domain '@example.com' 
        # but let's be more specific with our test emails.
        test_emails = [
            "test_pm1@example.com", "test_pm2@example.com",
            "test_emp1_1@example.com", "test_emp1_2@example.com",
            "test_emp2_1@example.com", "test_emp2_2@example.com"
        ]
        
        res = await session.execute(select(User).where(User.email.in_(test_emails)))
        users_to_del = res.scalars().all()
        user_ids = [u.id for u in users_to_del]
        
        if not user_ids:
            print("No test users found. Cleanup might have already been run.")
        else:
            # Get linked JiraUser IDs
            jira_user_ids = [u.jira_user_id for u in users_to_del if u.jira_user_id]
            
            # Delete in order of constraints
            # 1. Worklogs
            if jira_user_ids:
                await session.execute(delete(Worklog).where(Worklog.jira_user_id.in_(jira_user_ids)))
                print(f"Deleted worklogs for {len(jira_user_ids)} Jira users.")
            
            # 2. TimesheetPeriods
            await session.execute(delete(TimesheetPeriod).where(TimesheetPeriod.user_id.in_(user_ids)))
            print(f"Deleted timesheet periods for {len(user_ids)} users.")
            
            # 3. Users (Login) - nullify jira_user_id first to avoid cycle if any (though not strictly needed if we delete JiraUser anyway)
            # but JiraUser is FK to User? No, User has jira_user_id (FK to jira_users.id).
            # Wait, JiraUser also has user_id property but it's not a real column.
            
            # 4. JiraUsers
            if jira_user_ids:
                # We need to nullify jira_user_id in User first to break the FK constraint
                for u in users_to_del:
                    u.jira_user_id = None
                await session.flush()
                
                await session.execute(delete(JiraUser).where(JiraUser.id.in_(jira_user_ids)))
                print(f"Deleted {len(jira_user_ids)} Jira users.")

            # 5. Teams (identify by Test Team Beta / Alpha)
            # First nullify pm_id in teams to avoid FK to User
            res_teams = await session.execute(select(Team).where(Team.name.like("Test Team %")))
            teams_to_del = res_teams.scalars().all()
            for t in teams_to_del:
                t.pm_id = None
            await session.flush()

            # 6. Now delete Users
            await session.execute(delete(User).where(User.id.in_(user_ids)))
            print(f"Deleted {len(user_ids)} login users.")
            
            # 7. Delete Teams
            for t in teams_to_del:
                await session.delete(t)
            print(f"Deleted {len(teams_to_del)} test teams.")
            
            # 8. Delete Divisions
            res_divs = await session.execute(select(Division).where(Division.name.like("Test Division %")))
            divs_to_del = res_divs.scalars().all()
            for d in divs_to_del:
                await session.delete(d)
            print(f"Deleted {len(divs_to_del)} test divisions.")
            
            # 9. Delete Departments
            res_depts = await session.execute(select(Department).where(Department.name.like("Test Dept %")))
            depts_to_del = res_depts.scalars().all()
            for d in depts_to_del:
                await session.delete(d)
            print(f"Deleted {len(depts_to_del)} test departments.")

        await session.commit()
        print("--- Cleanup Complete! ---")

if __name__ == "__main__":
    asyncio.run(cleanup())
