import asyncio

from core.database import async_session
from models.org import Department, Division, Team
from models.project import Issue, Project, Release, Sprint
from models.timesheet import Worklog
from models.user import JiraUser, User
from sqlalchemy import delete, select, text


async def cleanup_db():
    async with async_session() as db:
        # 1. Identify User to keep
        res = await db.execute(select(User).order_by(User.id).limit(1))
        user_to_keep = res.scalar_one_or_none()

        if not user_to_keep:
            print("No users found to keep!")
            return

        print(f"Keeping user: {user_to_keep.email} (ID: {user_to_keep.id})")

        # 2. Delete data from tables in order of dependencies
        # Worklogs first
        await db.execute(delete(Worklog))

        # Issue relationships
        await db.execute(text("DELETE FROM issue_sprints"))
        await db.execute(text("DELETE FROM issue_releases"))

        # Issues, Sprints, Releases
        await db.execute(delete(Issue))
        await db.execute(delete(Sprint))
        await db.execute(delete(Release))

        # Projects
        await db.execute(delete(Project))

        # Org Structure
        # Teams might have FKs to Users, but we are keeping our main user.
        await db.execute(delete(Team))
        await db.execute(delete(Division))
        await db.execute(delete(Department))

        # Unlink user_to_keep from JiraUser before deletion
        user_to_keep.jira_user_id = None
        await db.flush()

        # Jira Users
        await db.execute(delete(JiraUser))

        # Delete all other system users EXCEPT the one we keep
        await db.execute(delete(User).where(User.id != user_to_keep.id))

        await db.commit()
        print("Database cleanup complete. Only 1 system user remains.")


if __name__ == "__main__":
    asyncio.run(cleanup_db())
