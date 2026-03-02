import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import JiraUser, OrgUnit, Role, User, UserOrgRole
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_scenario_02_matrix_pm(client: AsyncClient, db: AsyncSession):
    """Сценарий 2: Матрица ПМ-а (кросс-функциональная команда)"""
    # 1. Создание юнита и PM
    unit = OrgUnit(name="Project X Team")
    db.add(unit)
    await db.flush()

    pm_user = User(email="pm@ex.com", full_name="PM User", hashed_password=get_password_hash("pass"), role="PM")
    db.add(pm_user)
    await db.flush()

    # Роль менеджера
    role = Role(name="Manager")
    db.add(role)
    await db.flush()

    pm_role = UserOrgRole(user_id=pm_user.id, org_unit_id=unit.id, role_id=role.id)
    db.add(pm_role)

    # 2. Создание 8 сотрудников
    for i in range(8):
        ju = JiraUser(jira_account_id=f"ju-matrix-{i}", display_name=f"Dev {i}", org_unit_id=unit.id)
        db.add(ju)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "pm@ex.com", "password": "pass"})
    pm_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Проверка сотрудников юнита через API
    resp = await client.get(f"/api/v1/org/employees?org_unit_id={unit.id}", headers=pm_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 8
