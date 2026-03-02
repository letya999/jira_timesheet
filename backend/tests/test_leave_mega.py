import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import ApprovalRoute, JiraUser, OrgUnit, Role, User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_leave_mega_coverage(client: AsyncClient, db: AsyncSession):
    # 1. Setup Admin
    admin = User(
        email="admin_mega@ex.com",
        full_name="Admin Mega",
        hashed_password=get_password_hash("testpass"),
        role="Admin",
        is_active=True,
    )
    db.add(admin)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_mega@ex.com", "password": "testpass"})
    assert login_res.status_code == 200
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 2. Setup HR
    hr = User(
        email="hr_mega@ex.com",
        full_name="HR Mega",
        hashed_password=get_password_hash("testpass"),
        role="HR",
        is_active=True,
    )
    db.add(hr)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "hr_mega@ex.com", "password": "testpass"})
    hr_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 3. Setup Team & Route
    unit = OrgUnit(name="Mega Unit")
    db.add(unit)
    await db.flush()

    role = Role(name="CEO", is_system=True)  # CEO role
    db.add(role)
    await db.flush()

    route = ApprovalRoute(org_unit_id=unit.id, target_type="leave", step_order=1, role_id=role.id)
    db.add(route)
    await db.flush()

    # 4. Setup Employee in Team
    emp = User(
        email="emp_mega@ex.com",
        full_name="Emp Mega",
        hashed_password=get_password_hash("testpass"),
        role="Employee",
        is_active=True,
    )
    db.add(emp)
    await db.flush()
    ju = JiraUser(jira_account_id="ju-mega", display_name="Jura Mega", org_unit_id=unit.id)
    db.add(ju)
    await db.flush()
    emp.jira_user_id = ju.id
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_mega@ex.com", "password": "testpass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 5. Create Leave (Success)
    payload = {"type": "VACATION", "start_date": "2026-05-01", "end_date": "2026-05-05", "reason": "R"}
    resp = await client.post("/api/v1/leaves/", json=payload, headers=emp_headers)
    assert resp.status_code == 200
    leave_id = resp.json()["id"]

    # 6. Get all leaves (Admin)
    resp = await client.get("/api/v1/leaves/all", headers=admin_headers)
    assert resp.status_code == 200

    # 7. Get all leaves (HR)
    resp = await client.get("/api/v1/leaves/all", headers=hr_headers)
    assert resp.status_code == 200

    # 8. Update status (REJECTED)
    resp = await client.patch(
        f"/api/v1/leaves/{leave_id}", json={"status": "REJECTED", "comment": "No"}, headers=admin_headers
    )
    assert resp.status_code == 200

    # 9. Get my leaves
    resp = await client.get("/api/v1/leaves/my", headers=emp_headers)
    assert resp.status_code == 200

    # 10. Get team leaves
    resp = await client.get("/api/v1/leaves/team", headers=admin_headers)
    assert resp.status_code == 200
