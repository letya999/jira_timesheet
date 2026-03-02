import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_scenario_07_forgotten_worklog(client: AsyncClient, db: AsyncSession):
    """Сценарий 7: Забывчивый сотрудник (Ручной ввод ворклога)"""
    emp = User(email="emp_forg@ex.com", full_name="Emp Forg", hashed_password=get_password_hash("pass"))
    db.add(emp)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_forg@ex.com", "password": "pass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Эндпоинт /my-period возвращает статус периода
    resp = await client.get("/api/v1/approvals/my-period", headers=emp_headers)
    assert resp.status_code == 200
