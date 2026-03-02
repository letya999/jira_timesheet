from datetime import date

import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models.leave import LeaveRequest, LeaveStatus, LeaveType
from models.org import ApprovalRoute, OrgUnit, Role, UserOrgRole
from models.user import JiraUser, User
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def setup_leave_data(db: AsyncSession, admin_user: User):
    # Create employee
    employee = User(
        email="emp_leave@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="Employee Leave",
        role="Employee",
        is_active=True
    )
    db.add(employee)
    await db.flush()

    # Create PM
    pm = User(
        email="pm_leave@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="PM Leave",
        role="PM",
        is_active=True
    )
    db.add(pm)
    await db.flush()

    # Create OrgUnit
    team = OrgUnit(name="Leave OrgUnit")
    db.add(team)
    await db.flush()

    # Create PM Role and assign PM to team
    pm_role = Role(name="PM", is_system=True)
    db.add(pm_role)
    await db.flush()

    uor = UserOrgRole(user_id=pm.id, org_unit_id=team.id, role_id=pm_role.id)
    db.add(uor)
    await db.flush()

    # Create Jira Users
    jira_emp = JiraUser(jira_account_id="jira-emp", display_name="Emp Jira", org_unit_id=team.id)
    db.add(jira_emp)
    await db.flush()

    employee.jira_user_id = jira_emp.id
    await db.commit()

    return {"admin": admin_user, "employee": employee, "pm": pm, "team": team}


@pytest.mark.asyncio
async def test_create_leave_request(client: AsyncClient, setup_leave_data):
    # Login as employee
    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_leave@example.com", "password": "testpass"})
    assert login_res.status_code == 200, f"Login failed: {login_res.json()}"
    emp_token = login_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    payload = {
        "type": "VACATION",
        "start_date": "2026-07-01",
        "end_date": "2026-07-14",
        "reason": "Summer Vacation"
    }

    response = await client.post("/api/v1/leaves/", json=payload, headers=emp_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "VACATION"
    assert data["start_date"] == "2026-07-01"
    assert data["status"] == "PENDING"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_leave_request_fail(client: AsyncClient, setup_leave_data):
    # Login as employee
    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_leave@example.com", "password": "testpass"})
    emp_token = login_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # End date < Start date
    payload = {
        "type": "VACATION",
        "start_date": "2026-07-14",
        "end_date": "2026-07-01",
        "reason": "Bad dates"
    }
    response = await client.post("/api/v1/leaves/", json=payload, headers=emp_headers)
    assert response.status_code == 400
    assert "End date" in response.json()["detail"]

    # Overlapping
    payload1 = {
        "type": "VACATION",
        "start_date": "2026-07-01",
        "end_date": "2026-07-10",
        "reason": "First"
    }
    await client.post("/api/v1/leaves/", json=payload1, headers=emp_headers)

    payload2 = {
        "type": "SICK_LEAVE",
        "start_date": "2026-07-05",
        "end_date": "2026-07-15",
        "reason": "Overlapping"
    }
    response = await client.post("/api/v1/leaves/", json=payload2, headers=emp_headers)
    assert response.status_code == 400
    assert "overlapping" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_my_leave_requests(client: AsyncClient, setup_leave_data, db: AsyncSession):
    # Login as employee
    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_leave@example.com", "password": "testpass"})
    emp_token = login_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Add a request
    leave = LeaveRequest(
        user_id=setup_leave_data["employee"].id,
        type=LeaveType.SICK_LEAVE,
        status=LeaveStatus.PENDING,
        start_date=date(2026, 8, 1),
        end_date=date(2026, 8, 5)
    )
    db.add(leave)
    await db.commit()

    response = await client.get("/api/v1/leaves/my", headers=emp_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["type"] == "SICK_LEAVE"


@pytest.mark.asyncio
async def test_get_team_leave_requests(client: AsyncClient, setup_leave_data, db: AsyncSession):
    # Add a request for employee
    leave = LeaveRequest(
        user_id=setup_leave_data["employee"].id,
        type=LeaveType.DAY_OFF,
        status=LeaveStatus.PENDING,
        start_date=date(2026, 9, 1),
        end_date=date(2026, 9, 2),
        approver_id=setup_leave_data["pm"].id
    )
    db.add(leave)
    await db.commit()

    # Login as PM
    login_res = await client.post("/api/v1/auth/login", data={"username": "pm_leave@example.com", "password": "testpass"})
    pm_token = login_res.json()["access_token"]
    pm_headers = {"Authorization": f"Bearer {pm_token}"}

    response = await client.get("/api/v1/leaves/team", headers=pm_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["type"] == "DAY_OFF"


@pytest.mark.asyncio
async def test_update_leave_status(client: AsyncClient, setup_leave_data, db: AsyncSession):
    leave = LeaveRequest(
        user_id=setup_leave_data["employee"].id,
        type=LeaveType.VACATION,
        status=LeaveStatus.PENDING,
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 5)
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    # Login as PM
    login_res = await client.post("/api/v1/auth/login", data={"username": "pm_leave@example.com", "password": "testpass"})
    pm_token = login_res.json()["access_token"]
    pm_headers = {"Authorization": f"Bearer {pm_token}"}

    payload = {
        "status": "APPROVED",
        "comment": "Have a good trip"
    }

    response = await client.patch(f"/api/v1/leaves/{leave.id}", json=payload, headers=pm_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "APPROVED"
    assert data["comment"] == "Have a good trip"


@pytest.mark.asyncio
async def test_get_all_leaves_hr(client: AsyncClient, setup_leave_data, db: AsyncSession, auth_headers):
    # admin auth headers are passed
    leave = LeaveRequest(
        user_id=setup_leave_data["employee"].id,
        type=LeaveType.VACATION,
        status=LeaveStatus.APPROVED,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 5)
    )
    db.add(leave)
    await db.commit()

    response = await client.get("/api/v1/leaves/all", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Check that at least one is returned
    assert len(data) >= 1

@pytest.mark.asyncio
async def test_get_team_leaves_no_units(client: AsyncClient, db: AsyncSession):
    # User with no org units
    user = User(email="nounits@ex.com", hashed_password=get_password_hash("pw"), full_name="No Units", role="Employee", is_active=True)
    db.add(user)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "nounits@ex.com", "password": "pw"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/v1/leaves/team", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_update_leave_unauthorized(client: AsyncClient, setup_leave_data, db: AsyncSession):
    leave = LeaveRequest(
        user_id=setup_leave_data["employee"].id,
        type=LeaveType.VACATION,
        status=LeaveStatus.PENDING,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 5)
    )
    db.add(leave)
    await db.commit()

    # Another employee tries to approve
    other = User(email="other@ex.com", hashed_password=get_password_hash("pw"), full_name="Other", role="Employee", is_active=True)
    db.add(other)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "other@ex.com", "password": "pw"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.patch(f"/api/v1/leaves/{leave.id}", json={"status": "APPROVED"}, headers=headers)
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_update_leave_not_found_or_not_pending(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # 404
    resp = await client.patch("/api/v1/leaves/99999", json={"status": "APPROVED"}, headers=auth_headers)
    assert resp.status_code == 404

    # Not pending
    leave = LeaveRequest(user_id=1, type="VACATION", status="APPROVED", start_date=date.today(), end_date=date.today())
    db.add(leave)
    await db.commit()
    resp = await client.patch(f"/api/v1/leaves/{leave.id}", json={"status": "APPROVED"}, headers=auth_headers)
    assert resp.status_code == 400

@pytest.mark.asyncio
async def test_leave_approval_routing(client: AsyncClient, setup_leave_data, db: AsyncSession):
    # Step 1: PM
    # Step 2: Admin
    from models.org import Role

    # Ensure roles exist
    admin_role = await db.execute(select(Role).where(Role.name == "Admin"))
    admin_role = admin_role.scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="Admin", is_system=True)
        db.add(admin_role)
        await db.flush()

    pm_role = await db.execute(select(Role).where(Role.name == "PM"))
    pm_role = pm_role.scalar_one_or_none()
    if not pm_role:
        pm_role = Role(name="PM", is_system=True)
        db.add(pm_role)
        await db.flush()

    await db.execute(delete(ApprovalRoute).where(ApprovalRoute.org_unit_id == setup_leave_data["team"].id))

    route1 = ApprovalRoute(org_unit_id=setup_leave_data["team"].id, target_type='leave', step_order=1, role_id=pm_role.id)
    route2 = ApprovalRoute(org_unit_id=setup_leave_data["team"].id, target_type='leave', step_order=2, role_id=admin_role.id)
    db.add_all([route1, route2])
    await db.commit()

    leave = LeaveRequest(
        user_id=setup_leave_data["employee"].id,
        type=LeaveType.VACATION,
        status=LeaveStatus.PENDING,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 5),
        current_step_order=1
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    login_res = await client.post("/api/v1/auth/login", data={"username": "pm_leave@example.com", "password": "testpass"})
    pm_token = login_res.json()["access_token"]
    pm_headers = {"Authorization": f"Bearer {pm_token}"}

    resp = await client.patch(f"/api/v1/leaves/{leave.id}", json={"status": "APPROVED", "comment": "PM ok"}, headers=pm_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "PENDING"
    assert resp.json()["current_step_order"] == 2

    admin_login_res = await client.post("/api/v1/auth/login", data={"username": "testadmin@example.com", "password": "testpass"})
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.patch(f"/api/v1/leaves/{leave.id}", json={"status": "APPROVED", "comment": "Admin ok"}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "APPROVED"

@pytest.mark.asyncio
async def test_get_all_leaves_comprehensive(client: AsyncClient, setup_leave_data, db: AsyncSession, auth_headers):
    date.today()
    # 1. Status filter
    resp = await client.get("/api/v1/leaves/all?status=APPROVED", headers=auth_headers)
    assert resp.status_code == 200

    # 2. User filter
    resp = await client.get(f"/api/v1/leaves/all?user_id={setup_leave_data['employee'].id}", headers=auth_headers)
    assert resp.status_code == 200

    # 3. Org Unit filter
    resp = await client.get(f"/api/v1/leaves/all?org_unit_id={setup_leave_data['team'].id}", headers=auth_headers)
    assert resp.status_code == 200

    # 4. HR role access
    hr_user = User(email="hr@ex.com", full_name="HR User", hashed_password=get_password_hash("testpass"), role="HR", is_active=True)
    db.add(hr_user)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "hr@ex.com", "password": "testpass"})
    hr_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    resp = await client.get("/api/v1/leaves/all", headers=hr_headers)
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_update_leave_reject(client: AsyncClient, setup_leave_data, db: AsyncSession, auth_headers):
    leave = LeaveRequest(
        user_id=setup_leave_data["employee"].id,
        type=LeaveType.VACATION,
        status=LeaveStatus.PENDING,
        start_date=date(2026, 12, 10),
        end_date=date(2026, 12, 15)
    )
    db.add(leave)
    await db.commit()

    resp = await client.patch(f"/api/v1/leaves/{leave.id}", json={"status": "REJECTED", "comment": "No"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "REJECTED"

@pytest.mark.asyncio
async def test_create_leave_no_team(client: AsyncClient, db: AsyncSession):
    # User with no team
    user = User(email="noteam@ex.com", hashed_password=get_password_hash("pw"), full_name="No Team", role="Employee", is_active=True)
    db.add(user)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "noteam@ex.com", "password": "pw"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"type": "VACATION", "start_date": "2026-01-01", "end_date": "2026-01-02", "reason": "R"}
    resp = await client.post("/api/v1/leaves/", json=payload, headers=headers)
    assert resp.status_code == 200
