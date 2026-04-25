import asyncio
import os
import sys

from sqlalchemy import delete, select

# Ensure the parent directory is in the path so we can import models/core
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import async_session
from models import Department, Division, JiraUser, Team, TimesheetPeriod, User, Worklog


async def cleanup():
    async with async_session() as session:
        print("--- Starting Test Org Cleanup ---")

        # 1. Identify users to delete
        test_emails = [
            "test_pm1@example.com",
            "test_pm2@example.com",
            "test_emp1_1@example.com",
            "test_emp1_2@example.com",
            "test_emp2_1@example.com",
            "test_emp2_2@example.com",
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
            if jira_user_ids:
                await session.execute(delete(Worklog).where(Worklog.jira_user_id.in_(jira_user_ids)))
                print(f"Deleted worklogs for {len(jira_user_ids)} Jira users.")

            await session.execute(delete(TimesheetPeriod).where(TimesheetPeriod.user_id.in_(user_ids)))
            print(f"Deleted timesheet periods for {len(user_ids)} users.")

            if jira_user_ids:
                # Nullify jira_user_id in User first to break the FK constraint
                for u in users_to_del:
                    u.jira_user_id = None
                await session.flush()

                await session.execute(delete(JiraUser).where(JiraUser.id.in_(jira_user_ids)))
                print(f"Deleted {len(jira_user_ids)} Jira users.")

            # Nullify pm_id in teams to avoid FK to User
            res_teams = await session.execute(select(Team).where(Team.name.like("Test Team %")))
            teams_to_del = res_teams.scalars().all()
            for t in teams_to_del:
                t.pm_id = None
            await session.flush()

            await session.execute(delete(User).where(User.id.in_(user_ids)))
            print(f"Deleted {len(user_ids)} login users.")

            for t in teams_to_del:
                await session.delete(t)
            print(f"Deleted {len(teams_to_del)} test teams.")

            res_divs = await session.execute(select(Division).where(Division.name.like("Test Division %")))
            divs_to_del = res_divs.scalars().all()
            for d in divs_to_del:
                await session.delete(d)
            print(f"Deleted {len(divs_to_del)} test divisions.")

            res_depts = await session.execute(select(Department).where(Department.name.like("Test Dept %")))
            depts_to_del = res_depts.scalars().all()
            for d in depts_to_del:
                await session.delete(d)
            print(f"Deleted {len(depts_to_del)} test departments.")

        await session.commit()
        print("--- Cleanup Complete! ---")


if __name__ == "__main__":
    asyncio.run(cleanup())
