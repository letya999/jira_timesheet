import pytest
from httpx import AsyncClient
from core.security import get_password_hash
from models import User, JiraUser, OrgUnit, Worklog, WorklogCategory
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

@pytest.fixture
async def setup_control_sheet_data(db: AsyncSession):
    # 1. Create PM
    pm = User(
        email="pm@example.com",
        hashed_password=get_password_hash("pass"),
        full_name="OrgUnit Lead PM",
        role="PM"
    )
    # 2. Create Admin
    admin = User(
        email="admin@example.com",
        hashed_password=get_password_hash("pass"),
        full_name="Super Admin",
        role="Admin"
    )
    db.add_all([pm, admin])
    await db.flush()

    # 3. Create Org Structure
    dept = OrgUnit(name="IT")
    db.add(dept)
    await db.flush()
    
    div = OrgUnit(name="Software", parent_id=dept.id)
    db.add(div)
    await db.flush()
    
    team_a = OrgUnit(name="OrgUnit Alpha", parent_id=div.id)
    team_b = OrgUnit(name="OrgUnit Beta", parent_id=div.id) # Different team
    db.add_all([team_a, team_b])
    await db.flush()

    # Create PM Role and assign PM to team_a
    from models.org import Role, UserOrgRole
    pm_role = Role(name="PM", is_system=True)
    db.add(pm_role)
    await db.flush()
    
    uor = UserOrgRole(user_id=pm.id, org_unit_id=team_a.id, role_id=pm_role.id)
    db.add(uor)
    await db.flush()

    # 4. Create Jira Users
    u1 = JiraUser(
        jira_account_id="user_a",
        display_name="Alice (OrgUnit A)",
        org_unit_id=team_a.id,
        is_active=True
    )
    u2 = JiraUser(
        jira_account_id="user_b",
        display_name="Bob (OrgUnit B)",
        org_unit_id=team_b.id,
        is_active=True
    )
    db.add_all([u1, u2])
    await db.flush()

    # Link Alice to a real login user
    alice_login = User(
        email="alice@example.com",
        hashed_password=get_password_hash("pass"),
        full_name="Alice User",
        role="Employee",
        jira_user_id=u1.id
    )
    db.add(alice_login)
    await db.flush()

    # 5. Create Worklogs
    cat = WorklogCategory(name="Development")
    db.add(cat)
    await db.flush()

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
    db.add_all([w1, w2])
    await db.commit()
    return {"pm": pm, "admin": admin, "alice": alice_login}

async def get_token(ac, email, password):
    res = await ac.post("/api/v1/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]

@pytest.mark.asyncio
async def test_pm_dashboard_scoping(client: AsyncClient, setup_control_sheet_data):
    """Verify that PM only sees their own team's worklogs."""
    token = await get_token(client, "pm@example.com", "pass")
    headers = {"Authorization": f"Bearer {token}"}

    today = date.today().isoformat()
    response = await client.get(f"/api/v1/reports/dashboard?start_date={today}&end_date={today}", headers=headers)
    
    assert response.status_code == 200
    data = response.json()["data"]
    
    assert len(data) == 1
    assert data[0]["User"] == "Alice (OrgUnit A)"
    assert data[0]["OrgUnit"] == "OrgUnit Alpha"

@pytest.mark.asyncio
async def test_admin_dashboard_sees_all(client: AsyncClient, setup_control_sheet_data):
    """Verify that Admin sees all teams."""
    token = await get_token(client, "admin@example.com", "pass")
    headers = {"Authorization": f"Bearer {token}"}

    today = date.today().isoformat()
    response = await client.get(f"/api/v1/reports/dashboard?start_date={today}&end_date={today}", headers=headers)
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 2

@pytest.mark.asyncio
async def test_jira_user_response_includes_user_id(client: AsyncClient, setup_control_sheet_data):
    token = await get_token(client, "admin@example.com", "pass")
    headers = {"Authorization": f"Bearer {token}"}

    response = await client.get("/api/v1/org/employees", headers=headers)
    assert response.status_code == 200
    items = response.json()["items"]
    
    alice = next(u for u in items if "Alice" in u["display_name"])
    bob = next(u for u in items if "Bob" in u["display_name"])
    
    assert alice["user_id"] is not None
    assert bob["user_id"] is None

@pytest.mark.asyncio
async def test_team_periods_scoping_for_pm(client: AsyncClient, setup_control_sheet_data):
    token = await get_token(client, "pm@example.com", "pass")
    headers = {"Authorization": f"Bearer {token}"}

    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    
    response = await client.get(
        f"/api/v1/approvals/team-periods?start_date={monday.isoformat()}&end_date={sunday.isoformat()}", 
        headers=headers
    )
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_pm_approves_timesheet(client: AsyncClient, setup_control_sheet_data):
    alice_token = await get_token(client, "alice@example.com", "pass")
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    
    sub_res = await client.post(
        "/api/v1/approvals/submit", 
        json={"start_date": monday.isoformat(), "end_date": sunday.isoformat()},
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert sub_res.status_code == 200
    period_id = sub_res.json()["id"]

    pm_token = await get_token(client, "pm@example.com", "pass")
    pm_headers = {"Authorization": f"Bearer {pm_token}"}
    
    app_res = await client.post(
        f"/api/v1/approvals/{period_id}/approve",
        json={"status": "APPROVED", "comment": "Good job"},
        headers=pm_headers
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "APPROVED"
