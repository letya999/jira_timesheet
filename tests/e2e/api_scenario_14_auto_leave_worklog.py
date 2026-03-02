import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_scenario_14_auto_leave_worklog(client: AsyncClient, db: AsyncSession):
    """Сценарий 14: Автоматический ворклог при отпуске"""
    emp = User(email="emp_sc14@ex.com", full_name="Emp 14", hashed_password=get_password_hash("pass"))
    db.add(emp)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_sc14@ex.com", "password": "pass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    payload = {"type": "VACATION", "start_date": "2026-11-01", "end_date": "2026-11-02", "reason": "Test"}
    resp = await client.post("/api/v1/leaves/", json=payload, headers=emp_headers)
    assert resp.status_code == 200
