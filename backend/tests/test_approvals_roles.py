import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, JiraUser, TimesheetPeriod
from core.security import get_password_hash
from datetime import date

@pytest.mark.asyncio
async def test_approvals_various_roles(client: AsyncClient, db: AsyncSession):
    # 1. CEO Role
    ceo = User(email="ceo@ex.com", full_name="CEO", hashed_password=get_password_hash("pw"), role="CEO", is_active=True)
    db.add(ceo)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "ceo@ex.com", "password": "pw"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    
    resp = await client.get("/api/v1/approvals/team-periods?start_date=2026-01-01&end_date=2026-01-07", headers=headers)
    assert resp.status_code == 200
    
    # 2. PM Role
    pm = User(email="pm_test@ex.com", full_name="PM", hashed_password=get_password_hash("pw"), role="PM", is_active=True)
    db.add(pm)
    await db.commit()
    login_pm = await client.post("/api/v1/auth/login", data={"username": "pm_test@ex.com", "password": "pw"})
    pm_headers = {"Authorization": f"Bearer {login_pm.json()['access_token']}"}
    
    resp = await client.get("/api/v1/approvals/team-periods?start_date=2026-01-01&end_date=2026-01-07", headers=pm_headers)
    assert resp.status_code == 200
