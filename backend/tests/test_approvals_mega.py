from datetime import date, timedelta

import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import JiraUser, OrgUnit, User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_approvals_mega_coverage(client: AsyncClient, db: AsyncSession):
    # 1. Setup Admin
    admin = User(email="admin_app_mega@ex.com", full_name="Admin App Mega", hashed_password=get_password_hash("testpass"), role="Admin", is_active=True)
    db.add(admin)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_app_mega@ex.com", "password": "testpass"})
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 2. Setup Team
    unit = OrgUnit(name="App Mega Unit")
    db.add(unit)
    await db.flush()

    # 3. Setup Employee
    emp = User(email="emp_app_mega@ex.com", full_name="Emp App Mega", hashed_password=get_password_hash("testpass"), role="Employee", is_active=True)
    db.add(emp)
    await db.flush()
    ju = JiraUser(jira_account_id="ju-app-mega", display_name="Jura App Mega", org_unit_id=unit.id)
    db.add(ju)
    await db.flush()
    emp.jira_user_id = ju.id
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_app_mega@ex.com", "password": "testpass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 4. Get My Period
    resp = await client.get("/api/v1/approvals/my-period", headers=emp_headers)
    assert resp.status_code == 200

    # 5. Submit Period
    today = date.today()
    start_date = today - timedelta(days=today.weekday())
    end_date = start_date + timedelta(days=6)
    resp = await client.post("/api/v1/approvals/submit", json={"start_date": str(start_date), "end_date": str(end_date)}, headers=emp_headers)
    assert resp.status_code == 200
    period_id = resp.json()["id"]

    # 6. Get Team Periods
    resp = await client.get(f"/api/v1/approvals/team-periods?start_date={start_date}&end_date={end_date}", headers=admin_headers)
    assert resp.status_code == 200

    # 7. Approve
    resp = await client.post(f"/api/v1/approvals/{period_id}/approve", json={"status": "APPROVED", "comment": "OK"}, headers=admin_headers)
    assert resp.status_code == 200
