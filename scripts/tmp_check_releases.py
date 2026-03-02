import asyncio

from sqlalchemy import func, select

from backend.core.database import async_session
from backend.models.project import Issue, Project, Release, issue_releases
from backend.models.timesheet import Worklog


async def check_db():
    async with async_session() as session:
        # Check projects
        result = await session.execute(select(Project))
        projects = result.scalars().all()
        print(f"Projects in DB: {len(projects)}")
        for p in projects:
            print(f"  - ID: {p.id}, Key: {p.key}, Name: {p.name}, Active: {p.is_active}")

        # Check issues
        result = await session.execute(select(func.count(Issue.id)))
        count = result.scalar()
        print(f"\nTotal Issues in DB: {count}")

        # Check releases
        result = await session.execute(select(Release))
        releases = result.scalars().all()
        print(f"\nTotal Releases in DB: {len(releases)}")
        for r in releases:
            print(f"  - ID: {r.id}, JiraID: {r.jira_id}, Name: {r.name}, ProjectID: {r.project_id}")

        # Check issue_releases mapping
        result = await session.execute(select(issue_releases))
        mappings = result.all()
        print(f"\nTotal Issue-Release mappings in DB: {len(mappings)}")
        for m in mappings[:10]:
            print(f"  - IssueID: {m.issue_id}, ReleaseID: {m.release_id}")

        # Check worklogs
        result = await session.execute(select(func.count(Worklog.id)))
        wl_count = result.scalar()
        print(f"\nTotal Worklogs in DB: {wl_count}")


if __name__ == "__main__":
    asyncio.run(check_db())
