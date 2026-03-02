import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_scenario_05_conflict(client: AsyncClient, db: AsyncSession):
    """Сценарий 5: Конфликт интересов (отпуск vs подача)"""
    emp = User(email="emp_conf@ex.com", full_name="Emp Conf", hashed_password=get_password_hash("pass"))
    db.add(emp)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_conf@ex.com", "password": "pass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Подача отпуска
    payload = {"type": "VACATION", "start_date": "2026-09-01", "end_date": "2026-09-10"}
    resp = await client.post("/api/v1/leaves/", json=payload, headers=emp_headers)
    assert resp.status_code == 200
