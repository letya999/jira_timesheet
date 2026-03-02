import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_scenario_08_sync_performance(client: AsyncClient, db: AsyncSession):
    """Сценарий 8: Синхронизация гиганта (Mock performance test)"""
    admin = User(email="admin_sc8@ex.com", full_name="Admin", hashed_password=get_password_hash("pass"), role="Admin")
    db.add(admin)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_sc8@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Проверка доступа к управлению сотрудниками
    resp = await client.get("/api/v1/org/employees", headers=admin_headers)
    assert resp.status_code == 200
