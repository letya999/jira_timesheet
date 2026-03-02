import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_scenario_12_balance_correction(client: AsyncClient, db: AsyncSession):
    """Сценарий 12: Корректировка баланса отпусков (чтение своих)"""
    emp = User(email="emp_sc12@ex.com", full_name="Emp 12", hashed_password=get_password_hash("pass"))
    db.add(emp)
    await db.commit()
    
    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_sc12@ex.com", "password": "pass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    resp = await client.get("/api/v1/leaves/my", headers=emp_headers)
    assert resp.status_code == 200
