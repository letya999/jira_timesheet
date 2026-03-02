import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import OrgUnit, User, Role, ApprovalRoute
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_scenario_04_multi_approval(client: AsyncClient, db: AsyncSession):
    """Сценарий 4: Многоступенчатый фильтр"""
    unit = OrgUnit(name="API Team 4")
    db.add(unit)
    await db.flush()
    
    role1 = Role(name="Team Lead 4")
    role2 = Role(name="Div Head 4")
    db.add_all([role1, role2])
    await db.flush()

    route1 = ApprovalRoute(org_unit_id=unit.id, target_type="timesheet", step_order=1, role_id=role1.id)
    route2 = ApprovalRoute(org_unit_id=unit.id, target_type="timesheet", step_order=2, role_id=role2.id)
    db.add_all([route1, route2])
    await db.commit()

    # Проверка через API что маршруты создались
    admin = User(email="admin_m4@ex.com", full_name="Admin", hashed_password=get_password_hash("pass"), role="Admin")
    db.add(admin)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_m4@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    resp = await client.get(f"/api/v1/org/units/{unit.id}/approval-routes", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2
