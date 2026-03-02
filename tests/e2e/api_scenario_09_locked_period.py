import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from core.security import get_password_hash
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_scenario_09_locked_period(client: AsyncClient, db: AsyncSession):
    """Сценарий 9: Блокировка правок в одобренном периоде"""
    emp = User(email="emp_lock@ex.com", full_name="Emp Lock", hashed_password=get_password_hash("pass"))
    db.add(emp)
    await db.commit()
    
    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_lock@ex.com", "password": "pass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Submit period
    today = date.today()
    start = today - timedelta(days=today.weekday() + 7) # Last week
    end = start + timedelta(days=6)
    resp = await client.post(
        "/api/v1/approvals/submit", 
        json={"start_date": str(start), "end_date": str(end)}, 
        headers=emp_headers
    )
    assert resp.status_code == 200
    period_id = resp.json()["id"]

    # Admin approves
    admin = User(email="admin_sc9@ex.com", full_name="Admin", hashed_password=get_password_hash("pass"), role="Admin")
    db.add(admin)
    await db.commit()
    
    login_res_admin = await client.post("/api/v1/auth/login", data={"username": "admin_sc9@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res_admin.json()['access_token']}"}

    resp = await client.post(f"/api/v1/approvals/{period_id}/approve", json={"status": "APPROVED", "comment": "ok"}, headers=admin_headers)
    assert resp.status_code == 200
