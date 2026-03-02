import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import ApprovalRoute, OrgUnit, Role, User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_scenario_06_double_check(client: AsyncClient, db: AsyncSession):
    """Сценарий 6: Двойная проверка отпуска (Manager + HR)"""
    unit = OrgUnit(name="Double Check Unit")
    db.add(unit)
    await db.flush()

    role_mgr = Role(name="Manager 6")
    role_hr = Role(name="HR 6")
    db.add_all([role_mgr, role_hr])
    await db.flush()

    # Route steps
    r1 = ApprovalRoute(org_unit_id=unit.id, target_type="leave", step_order=1, role_id=role_mgr.id)
    r2 = ApprovalRoute(org_unit_id=unit.id, target_type="leave", step_order=2, role_id=role_hr.id)
    db.add_all([r1, r2])
    await db.commit()

    admin = User(email="admin_sc6@ex.com", full_name="Admin", hashed_password=get_password_hash("pass"), role="Admin")
    db.add(admin)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_sc6@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    resp = await client.get(f"/api/v1/org/units/{unit.id}/approval-routes", headers=admin_headers)
    assert resp.status_code == 200
    routes = resp.json()
    assert len(routes) == 2
