import pytest
from httpx import AsyncClient
from models.org import OrgUnit
from models.user import JiraUser, User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_org_extended(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    admin_user_id = admin_user.id
    # 1. Employees
    resp = await client.get("/api/v1/org/employees", headers=auth_headers)
    assert resp.status_code == 200
    assert "items" in resp.json()

    # 2. Update Employee
    ju = JiraUser(jira_account_id="ju-1", display_name="Jira User 1")
    db.add(ju)
    await db.commit()
    ju_id = ju.id
    # Expire to ensure next read gets fresh data and release session lock
    db.expire_all()

    resp = await client.patch(f"/api/v1/org/employees/{ju_id}", json={"weekly_quota": 35}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["weekly_quota"] == 35

    # 3. Roles
    resp = await client.post("/api/v1/org/roles", json={"name": "Manager"}, headers=auth_headers)
    assert resp.status_code == 200
    role_id = resp.json()["id"]

    resp = await client.get("/api/v1/org/roles", headers=auth_headers)
    assert any(r["name"] == "Manager" for r in resp.json())

    # 4. Org Unit Roles (Assignments)
    unit = OrgUnit(name="Unit X")
    db.add(unit)
    await db.commit()
    unit_id = unit.id
    db.expire_all()

    resp = await client.post("/api/v1/org/units/roles", json={"user_id": admin_user_id, "org_unit_id": unit_id, "role_id": role_id}, headers=auth_headers)
    assert resp.status_code == 200
    assign_id = resp.json()["id"]

    resp = await client.get(f"/api/v1/org/units/{unit_id}/roles", headers=auth_headers)
    assert len(resp.json()) >= 1

    # 5. Approval Routes
    resp = await client.post("/api/v1/org/units/approval-routes", json={"org_unit_id": unit_id, "target_type": "leave", "step_order": 1, "role_id": role_id}, headers=auth_headers)
    assert resp.status_code == 200
    route_id = resp.json()["id"]

    resp = await client.get(f"/api/v1/org/units/{unit_id}/approval-routes", headers=auth_headers)
    assert len(resp.json()) >= 1

    # 6. Delete
    resp = await client.delete(f"/api/v1/org/units/approval-routes/{route_id}", headers=auth_headers)
    assert resp.status_code == 204
    resp = await client.delete(f"/api/v1/org/units/roles/{assign_id}", headers=auth_headers)
    assert resp.status_code == 204
    resp = await client.delete(f"/api/v1/org/roles/{role_id}", headers=auth_headers)
    assert resp.status_code == 204
