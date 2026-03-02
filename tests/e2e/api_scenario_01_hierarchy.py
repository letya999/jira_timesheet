import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import OrgUnit, User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_scenario_01_hierarchy(client: AsyncClient, db: AsyncSession):
    """Сценарий 1: Масштабирование структуры (4 уровня)"""
    # 1. Создание структуры
    dept = OrgUnit(name="IT Department")
    db.add(dept)
    await db.flush()

    div = OrgUnit(name="Backend Division", parent_id=dept.id)
    db.add(div)
    await db.flush()

    dept_python = OrgUnit(name="Python Department", parent_id=div.id)
    db.add(dept_python)
    await db.flush()

    team_api = OrgUnit(name="API Team", parent_id=dept_python.id)
    db.add(team_api)
    await db.flush()
    await db.commit()

    # 2. Создание пользователей и авторизация
    admin = User(email="admin_hier@ex.com", full_name="Admin", hashed_password=get_password_hash("pass"), role="Admin")
    db.add(admin)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_hier@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Проверка получения структуры через API
    resp = await client.get("/api/v1/org/units", headers=admin_headers)
    assert resp.status_code == 200
    units = resp.json()
    assert any(u["name"] == "IT Department" for u in units)
    assert any(u["name"] == "API Team" for u in units)
