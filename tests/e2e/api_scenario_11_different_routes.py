import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import ApprovalRoute, OrgUnit, Role, User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_scenario_11_different_routes(client: AsyncClient, db: AsyncSession):
    """Сценарий 11: Уникальные маршруты для разных команд"""
    unit_a = OrgUnit(name="Team A 11")
    unit_b = OrgUnit(name="Team B 11")
    db.add_all([unit_a, unit_b])
    await db.flush()

    role_pm = Role(name="PM 11")
    role_mentor = Role(name="Mentor 11")
    db.add_all([role_pm, role_mentor])
    await db.flush()

    # Route A
    ra = ApprovalRoute(org_unit_id=unit_a.id, target_type="timesheet", step_order=1, role_id=role_pm.id)
    # Route B
    rb1 = ApprovalRoute(org_unit_id=unit_b.id, target_type="timesheet", step_order=1, role_id=role_mentor.id)
    rb2 = ApprovalRoute(org_unit_id=unit_b.id, target_type="timesheet", step_order=2, role_id=role_pm.id)
    db.add_all([ra, rb1, rb2])
    await db.commit()

    admin = User(email="admin_sc11@ex.com", full_name="Admin", hashed_password=get_password_hash("pass"), role="Admin")
    db.add(admin)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_sc11@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    resp = await client.get(f"/api/v1/org/units/{unit_b.id}/approval-routes", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2
