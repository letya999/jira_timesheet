
import asyncio
import httpx

async def test_filter():
    url = "http://localhost:8000/api/v1/auth/login"
    # Assuming there's a user. Let's find one or use env.
    # Actually I'll just check the DB for a user.
    # But wait, I can just use the DB directly to test the query logic if I want.
    # But let's test the endpoint.
    
    # Actually, I'll just use a DB-based test script to verify the logic I wrote in timesheet.py
    from sqlalchemy import select, and_, func
    from backend.core.database import async_session
    from backend.models.timesheet import Worklog
    from backend.models.project import Issue, Release
    
    async with async_session() as session:
        # TEST 1: No filter
        res = await session.execute(select(func.count(Worklog.id)))
        total = res.scalar()
        print(f"Total worklogs: {total}")
        
        # TEST 2: Filter by release 294
        release_id = 294
        filters = [Issue.releases.any(Release.id == release_id)]
        query = select(Worklog).outerjoin(Issue, Worklog.issue_id == Issue.id).where(and_(*filters))
        res = await session.execute(query)
        logs = res.scalars().all()
        print(f"Worklogs for release {release_id}: {len(logs)}")
        for l in logs[:3]:
            print(f"  - Log ID: {l.id}, Issue ID: {l.issue_id}")

if __name__ == "__main__":
    asyncio.run(test_filter())
