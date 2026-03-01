import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, JiraUser, OrgUnit, Role, UserOrgRole, ApprovalRoute
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_org_detailed_units(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    # 1. Create a tree
    dept = OrgUnit(name="Dept 1")
    db.add(dept)
    await db.flush()
    
    div = OrgUnit(name="Div 1", parent_id=dept.id)
    db.add(div)
    await db.flush()
    
    team = OrgUnit(name="Team 1", parent_id=div.id)
    db.add(team)
    await db.commit()
    
    # 2. Test Get All
    resp = await client.get("/api/v1/org/units", headers=auth_headers)
    assert resp.status_code == 200
    
    # 3. Test Patch
    resp = await client.patch(f"/api/v1/org/units/{team.id}", json={"name": "Team 1 Updated"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Team 1 Updated"
    
    # 4. Roles and assignments
    resp = await client.post("/api/v1/org/roles", json={"name": "Lead"}, headers=auth_headers)
    assert resp.status_code == 200
    role_id = resp.json()["id"]
    
    # Assignment
    resp = await client.post("/api/v1/org/units/roles", json={"user_id": admin_user.id, "org_unit_id": team.id, "role_id": role_id}, headers=auth_headers)
    assert resp.status_code == 200
    assign_id = resp.json()["id"]
    
    # Delete assignment
    resp = await client.delete(f"/api/v1/org/units/roles/{assign_id}", headers=auth_headers)
    assert resp.status_code == 204
    
    # Delete role
    resp = await client.delete(f"/api/v1/org/roles/{role_id}", headers=auth_headers)
    assert resp.status_code == 204
    
    # 5. Approval Routes
    role2 = Role(name="Approver")
    db.add(role2)
    await db.commit()
    
    resp = await client.post("/api/v1/org/units/approval-routes", json={"org_unit_id": team.id, "target_type": "leave", "step_order": 1, "role_id": role2.id}, headers=auth_headers)
    assert resp.status_code == 200
    route_id = resp.json()["id"]
    
    resp = await client.get(f"/api/v1/org/units/{team.id}/approval-routes", headers=auth_headers)
    assert resp.status_code == 200
    
    resp = await client.delete(f"/api/v1/org/units/approval-routes/{route_id}", headers=auth_headers)
    assert resp.status_code == 204
