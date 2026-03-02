import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import OrgUnit, User
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_scenario_15_delete_unit(client: AsyncClient, db: AsyncSession):
    """Сценарий 15: Удаление лишней команды (Cascade delete)"""
    unit = OrgUnit(name="Temp Unit 15")
    db.add(unit)
    await db.commit()

    admin = User(email="admin_sc15@ex.com", full_name="Admin 15", hashed_password=get_password_hash("pass"), role="Admin")
    db.add(admin)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_sc15@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Удаление
    resp = await client.delete(f"/api/v1/org/units/{unit.id}", headers=admin_headers)
    assert resp.status_code == 204

    # Проверка
    resp = await client.get("/api/v1/org/units", headers=admin_headers)
    assert resp.status_code == 200
    assert not any(u["id"] == unit.id for u in resp.json())
