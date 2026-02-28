import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from core.database import get_db
from core.security import get_password_hash
from models import User, JiraUser, Team, Department, Division, Worklog, WorklogCategory
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from models.base import Base
from datetime import date, timedelta

# Re-use setup from test_api but with more data
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        # 1. Create PM
        pm = User(
            email="pm@example.com",
            hashed_password=get_password_hash("pass"),
            full_name="Team Lead PM",
            role="PM"
        )
        # 2. Create Admin
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("pass"),
            full_name="Super Admin",
            role="Admin"
        )
        session.add_all([pm, admin])
        await session.flush()

        # 3. Create Org Structure
        dept = Department(name="IT")
        session.add(dept)
        await session.flush()
        
        div = Division(name="Software", department_id=dept.id)
        session.add(div)
        await session.flush()
        
        team_a = Team(name="Team Alpha", division_id=div.id, pm_id=pm.id)
        team_b = Team(name="Team Beta", division_id=div.id) # Different team
        session.add_all([team_a, team_b])
        await session.flush()

        # 4. Create Jira Users
        # User in Team A (PM's team)
        u1 = JiraUser(
            jira_account_id="user_a",
            display_name="Alice (Team A)",
            team_id=team_a.id,
            is_active=True
        )
        # User in Team B
        u2 = JiraUser(
            jira_account_id="user_b",
            display_name="Bob (Team B)",
            team_id=team_b.id,
            is_active=True
        )
        session.add_all([u1, u2])
        await session.flush()

        # Link Alice to a real login user (to check user_id)
        alice_login = User(
            email="alice@example.com",
            hashed_password=get_password_hash("pass"),
            full_name="Alice User",
            role="Employee",
            jira_user_id=u1.id
        )
        session.add(alice_login)
        await session.flush()

        # 5. Create Worklogs
        cat = WorklogCategory(name="Development")
        session.add(cat)
        await session.flush()

        w1 = Worklog(
            date=date.today(),
            hours=5.0,
            jira_user_id=u1.id,
            category_id=cat.id,
            type="JIRA"
        )
        w2 = Worklog(
            date=date.today(),
            hours=3.0,
            jira_user_id=u2.id,
            category_id=cat.id,
            type="JIRA"
        )
        session.add_all([w1, w2])
        await session.commit()
        
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def get_token(ac, email, password):
    res = await ac.post("/api/v1/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]

@pytest.mark.asyncio
async def test_pm_dashboard_scoping():
    """Verify that PM only sees their own team's worklogs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await get_token(ac, "pm@example.com", "pass")
        headers = {"Authorization": f"Bearer {token}"}

        # Fetch dashboard
        today = date.today().isoformat()
        response = await ac.get(f"/api/v1/reports/dashboard?start_date={today}&end_date={today}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # PM should only see Alice (Team A), not Bob (Team B)
        assert len(data) == 1
        assert data[0]["User"] == "Alice (Team A)"
        assert data[0]["Team"] == "Team Alpha"

@pytest.mark.asyncio
async def test_admin_dashboard_sees_all():
    """Verify that Admin sees all teams."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await get_token(ac, "admin@example.com", "pass")
        headers = {"Authorization": f"Bearer {token}"}

        today = date.today().isoformat()
        response = await ac.get(f"/api/v1/reports/dashboard?start_date={today}&end_date={today}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 2

@pytest.mark.asyncio
async def test_jira_user_response_includes_user_id():
    """Verify that the mapping between JiraUser and login User works in schema."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await get_token(ac, "admin@example.com", "pass")
        headers = {"Authorization": f"Bearer {token}"}

        response = await ac.get("/api/v1/org/employees", headers=headers)
        assert response.status_code == 200
        items = response.json()["items"]
        
        alice = next(u for u in items if "Alice" in u["display_name"])
        bob = next(u for u in items if "Bob" in u["display_name"])
        
        assert alice["user_id"] is not None
        assert bob["user_id"] is None

@pytest.mark.asyncio
async def test_team_periods_scoping_for_pm():
    """Verify PM only sees periods for their teams."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        token = await get_token(ac, "pm@example.com", "pass")
        headers = {"Authorization": f"Bearer {token}"}

        # Get periods for current week
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)
        
        response = await ac.get(
            f"/api/v1/approvals/team-periods?start_date={monday.isoformat()}&end_date={sunday.isoformat()}", 
            headers=headers
        )
        assert response.status_code == 200
        # In this test we didn't create any periods yet, but we check if it returns 0 or restricted
        # We need to create a period for Alice and Bob to be sure.
        
@pytest.mark.asyncio
async def test_pm_approves_timesheet():
    """Full workflow: Submit by user -> Approve by PM."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Alice submits
        alice_token = await get_token(ac, "alice@example.com", "pass")
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)
        
        sub_res = await ac.post(
            "/api/v1/approvals/submit", 
            json={"start_date": monday.isoformat(), "end_date": sunday.isoformat()},
            headers={"Authorization": f"Bearer {alice_token}"}
        )
        assert sub_res.status_code == 200
        period_id = sub_res.json()["id"]

        # 2. PM checks team periods
        pm_token = await get_token(ac, "pm@example.com", "pass")
        pm_headers = {"Authorization": f"Bearer {pm_token}"}
        
        periods_res = await ac.get(
            f"/api/v1/approvals/team-periods?start_date={monday.isoformat()}&end_date={sunday.isoformat()}", 
            headers=pm_headers
        )
        assert len(periods_res.json()) == 1
        assert periods_res.json()[0]["status"] == "SUBMITTED"

        # 3. PM approves
        app_res = await ac.post(
            f"/api/v1/approvals/{period_id}/approve",
            json={"status": "APPROVED", "comment": "Good job"},
            headers=pm_headers
        )
        assert app_res.status_code == 200
        assert app_res.json()["status"] == "APPROVED"
