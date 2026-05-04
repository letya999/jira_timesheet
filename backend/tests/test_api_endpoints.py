import json
import uuid
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import (
    ApprovalRoute,
    Issue,
    JiraUser,
    OrgUnit,
    Project,
    Role,
    TimesheetPeriod,
    User,
    UserOrgRole,
    Worklog,
    WorklogCategory,
)
from models.leave import LeaveRequest
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_auth_login(client: AsyncClient, db: AsyncSession):
    # Create user
    user = User(
        email="login@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="Login User",
        role="Admin",
        is_active=True,
    )
    db.add(user)
    await db.commit()

    response = await client.post("/api/v1/auth/login", data={"username": "login@example.com", "password": "testpass"})
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_auth_login_fail(client: AsyncClient, db: AsyncSession):
    # Wrong pass
    response = await client.post("/api/v1/auth/login", data={"username": "login@example.com", "password": "wrong"})
    assert response.status_code == 401

    # Inactive user
    user = User(
        email="inactive@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="Inactive User",
        role="Admin",
        is_active=False,
    )
    db.add(user)
    await db.commit()

    response = await client.post(
        "/api/v1/auth/login", data={"username": "inactive@example.com", "password": "testpass"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"


@pytest.mark.asyncio
async def test_get_users(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/users/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "testadmin@example.com"


@pytest.mark.asyncio
async def test_sync_users_endpoint(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    with patch("api.endpoints.users.sync_jira_users_to_db", return_value=10):
        response = await client.post("/api/v1/users/sync", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["synced"] == 10


@pytest.mark.asyncio
async def test_org_full_workflow(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Create Dept
    resp = await client.post("/api/v1/org/units", json={"name": "Sales"}, headers=auth_headers)
    assert resp.status_code == 200
    dept_id = resp.json()["id"]

    # Update Dept
    resp = await client.patch(f"/api/v1/org/units/{dept_id}", json={"name": "New Sales"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Sales"

    # Create Child OrgUnit
    resp = await client.post("/api/v1/org/units", json={"name": "Europe", "parent_id": dept_id}, headers=auth_headers)
    assert resp.status_code == 200
    div_id = resp.json()["id"]

    # Update Child OrgUnit
    resp = await client.patch(f"/api/v1/org/units/{div_id}", json={"name": "APAC"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "APAC"

    # Create another level
    resp = await client.post("/api/v1/org/units", json={"name": "OrgUnit A", "parent_id": div_id}, headers=auth_headers)
    assert resp.status_code == 200
    org_unit_id = resp.json()["id"]

    # Update OrgUnit
    resp = await client.patch(f"/api/v1/org/units/{org_unit_id}", json={"name": "OrgUnit B"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "OrgUnit B"

    # Delete OrgUnit
    resp = await client.delete(f"/api/v1/org/units/{org_unit_id}", headers=auth_headers)
    assert resp.status_code == 204

    # Get OrgUnits
    resp = await client.get("/api/v1/org/units", headers=auth_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_employee_endpoints(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    jira_user = JiraUser(jira_account_id="emp-1", display_name="Emp One", is_active=True)
    db.add(jira_user)
    await db.commit()

    # Get Employees
    resp = await client.get("/api/v1/org/employees", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    # Update Employee
    resp = await client.patch(f"/api/v1/org/employees/{jira_user.id}", json={"weekly_quota": 40}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["weekly_quota"] == 40


@pytest.mark.asyncio
async def test_projects_refresh_and_sync(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    with patch("api.endpoints.projects.sync_jira_projects_to_db", return_value=1):
        resp = await client.post("/api/v1/projects/refresh", headers=auth_headers)
        assert resp.status_code == 200

    project = Project(jira_id="P1", key="P1", name="Project 1", is_active=True)
    db.add(project)
    await db.commit()

    with patch("api.endpoints.projects.queue.enqueue", new_callable=AsyncMock) as mock_enqueue:
        mock_enqueue.return_value = AsyncMock(id="job-123")
        # Sync all
        resp = await client.post("/api/v1/projects/sync-all", headers=auth_headers)
        assert resp.status_code == 200

        # Sync single
        resp = await client.post(f"/api/v1/projects/{project.id}/sync", headers=auth_headers)
        assert resp.status_code == 200

    # Search issues
    issue = Issue(jira_id="I1", key="P1-1", summary="Issue 1", project_id=project.id)
    db.add(issue)
    await db.commit()
    resp = await client.get("/api/v1/projects/issues?search=P1-1", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_timesheet_detailed_endpoints(
    client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User
):
    jira_user = JiraUser(jira_account_id="admin-jira-detailed", display_name="Admin Jira", email=admin_user.email)
    db.add(jira_user)
    await db.flush()
    admin_user.jira_user_id = jira_user.id

    cat = WorklogCategory(name="Meetings")
    db.add(cat)
    await db.flush()

    project = Project(jira_id="P-DET", key="DET", name="Detail Project")
    db.add(project)
    await db.flush()

    issue = Issue(jira_id="I-DET", key="DET-1", summary="Det Sum", project_id=project.id)
    db.add(issue)
    await db.flush()

    worklog = Worklog(
        date=date.today(), hours=1.5, jira_user_id=jira_user.id, category_id=cat.id, issue_id=issue.id, type="MANUAL"
    )
    db.add(worklog)
    await db.commit()

    # Get all worklogs with filters
    resp = await client.get("/api/v1/timesheet/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    # Get my worklogs
    today = date.today()
    resp = await client.get(f"/api/v1/timesheet/worklogs?start_date={today}&end_date={today}", headers=auth_headers)
    assert resp.status_code == 200

    # Submit via timesheet router
    # Use real objects instead of mocks for Pydantic validation
    period = TimesheetPeriod(
        id=999,
        user_id=admin_user.id,
        start_date=today,
        end_date=today,
        status="SUBMITTED",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    with patch("services.timesheet.timesheet_service.submit_period", return_value=period):
        resp = await client.post(
            "/api/v1/timesheet/submit", json={"start_date": str(today), "end_date": str(today)}, headers=auth_headers
        )
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_manual_log(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    if not admin_user.jira_user_id:
        jira_user = JiraUser(jira_account_id="admin-jira-man", display_name="Admin Manual")
        db.add(jira_user)
        await db.flush()
        admin_user.jira_user_id = jira_user.id
        await db.commit()

    # Setup issue
    project = Project(jira_id="P-MAN", key="MAN", name="Manual Project")
    db.add(project)
    await db.flush()
    issue = Issue(jira_id="I-MAN", key="MAN-1", summary="Manual Issue", project_id=project.id)
    db.add(issue)
    await db.commit()

    payload = {
        "date": str(date.today()),
        "hours": 2.5,
        "category": "Meetings",
        "description": "Weekly meeting",
        "issue_id": issue.id,
    }

    response = await client.post("/api/v1/timesheet/manual", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["hours"] == 2.5
    assert response.json()["category"] == "Meetings"


@pytest.mark.asyncio
async def test_reports_endpoints(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    start = date.today() - timedelta(days=7)
    end = date.today()
    resp = await client.get(f"/api/v1/reports/dashboard?start_date={start}&end_date={end}", headers=auth_headers)
    assert resp.status_code == 200
    assert "data" in resp.json()


@pytest.mark.asyncio
async def test_sync_endpoint(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    if not admin_user.jira_user_id:
        jira_user = JiraUser(jira_account_id="admin-jira-sync-2", display_name="Admin Sync 2")
        db.add(jira_user)
        await db.flush()
        admin_user.jira_user_id = jira_user.id
        await db.commit()

    with patch("api.endpoints.sync.queue.enqueue"):
        resp = await client.post("/api/v1/sync/worklogs", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "sync_enqueued"


@pytest.mark.asyncio
async def test_sync_endpoint_fail(client: AsyncClient, db: AsyncSession):
    # User without jira_user_id
    user = User(
        email="nojira@ex.com",
        hashed_password=get_password_hash("pw"),
        full_name="No Jira",
        role="Employee",
        is_active=True,
    )
    db.add(user)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "nojira@ex.com", "password": "pw"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/api/v1/sync/worklogs", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "error"
    assert "No Jira account linked" in resp.json()["message"]


@pytest.mark.asyncio
async def test_approvals_endpoints(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    # Get my period
    resp = await client.get("/api/v1/approvals/my-period", headers=auth_headers)
    assert resp.status_code == 200

    period_data = resp.json()
    start_date = period_data["start_date"]
    end_date = period_data["end_date"]

    # Submit
    resp = await client.post(
        "/api/v1/approvals/submit", json={"start_date": start_date, "end_date": end_date}, headers=auth_headers
    )
    assert resp.status_code == 200
    period_id = resp.json()["id"]

    # Approve
    resp = await client.post(
        f"/api/v1/approvals/{period_id}/approve", json={"status": "APPROVED", "comment": "OK"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "APPROVED"


@pytest.mark.asyncio
async def test_approvals_period_types(client: AsyncClient, db: AsyncSession, admin_user: User):
    # Mock org unit with monthly reporting
    jira_user = JiraUser(jira_account_id="admin-jira-monthly", display_name="Admin Monthly", email=admin_user.email)
    db.add(jira_user)
    await db.flush()
    admin_user.jira_user_id = jira_user.id

    org = OrgUnit(name="Monthly Org", reporting_period="monthly")
    db.add(org)
    await db.flush()
    jira_user.org_unit_id = org.id
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": admin_user.email, "password": "testpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/v1/approvals/my-period?target_date=2026-03-01", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["start_date"] == "2026-03-01"
    # last day of march 2026 is 31
    assert resp.json()["end_date"] == "2026-03-31"

    # Test bi-weekly first half
    org.reporting_period = "bi-weekly"
    await db.commit()
    resp = await client.get("/api/v1/approvals/my-period?target_date=2026-03-05", headers=headers)
    assert resp.json()["start_date"] == "2026-03-01"
    assert resp.json()["end_date"] == "2026-03-15"

    # Test bi-weekly second half
    resp = await client.get("/api/v1/approvals/my-period?target_date=2026-03-20", headers=headers)
    assert resp.json()["start_date"] == "2026-03-16"
    assert resp.json()["end_date"] == "2026-03-31"


@pytest.mark.asyncio
async def test_submit_already_approved(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    today = date.today()
    period = TimesheetPeriod(
        user_id=admin_user.id, start_date=today, end_date=today, status="APPROVED", current_step_order=1
    )
    db.add(period)
    await db.commit()

    resp = await client.post(
        "/api/v1/approvals/submit", json={"start_date": str(today), "end_date": str(today)}, headers=auth_headers
    )
    assert resp.status_code == 400
    assert "already approved" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_calendar_endpoints(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    # 1. Sync
    with patch("api.endpoints.calendar.calendar_service.sync_holidays"):
        resp = await client.post("/api/v1/calendar/holidays/sync", headers=auth_headers)
        assert resp.status_code == 200

    # 2. Add custom holiday
    resp = await client.post(
        "/api/v1/calendar/holidays", json={"date": "2026-01-01", "name": "New Year"}, headers=auth_headers
    )
    assert resp.status_code == 200

    # 3. Get country
    resp = await client.get("/api/v1/calendar/country", headers=auth_headers)
    assert resp.status_code == 200

    # 4. Set country
    with patch("api.endpoints.calendar.calendar_service.sync_holidays"):
        resp = await client.post("/api/v1/calendar/country", json={"country_code": "US"}, headers=auth_headers)
        assert resp.status_code == 200

    # 5. Get events (with mock leave)
    leave = LeaveRequest(
        user_id=admin_user.id,
        type="VACATION",
        status="APPROVED",
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 5),
    )
    db.add(leave)
    await db.commit()

    resp = await client.get("/api/v1/calendar/events?start_date=2026-03-01&end_date=2026-03-31", headers=auth_headers)
    assert resp.status_code == 200
    events = resp.json()
    assert any(e["type"] == "leave" for e in events)

    # 6. Delete holiday
    resp = await client.delete("/api/v1/calendar/holidays/2026-01-01", headers=auth_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_notifications_endpoints(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    from models.notification import Notification

    n = Notification(user_id=admin_user.id, title="Test", message="Test Msg", is_read=False)
    db.add(n)
    await db.commit()

    # 1. Get notifications
    resp = await client.get("/api/v1/notifications/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    # 2. Get stats
    resp = await client.get("/api/v1/notifications/stats", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["unread_count"] >= 1

    # 3. Mark read
    resp = await client.patch(f"/api/v1/notifications/{n.id}", json={"is_read": True}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

    # 4. Mark all read
    resp = await client.post("/api/v1/notifications/mark-all-read", headers=auth_headers)
    assert resp.status_code == 200

    # 5. Fail scenarios
    # 404
    resp = await client.patch("/api/v1/notifications/9999", json={"is_read": True}, headers=auth_headers)
    assert resp.status_code == 404

    # 403
    other_user = User(email="other_n@ex.com", hashed_password="pw", full_name="Other", role="Employee", is_active=True)
    db.add(other_user)
    await db.flush()
    other_n = Notification(user_id=other_user.id, title="Other", message="Msg", is_read=False)
    db.add(other_n)
    await db.commit()

    resp = await client.patch(f"/api/v1/notifications/{other_n.id}", json={"is_read": True}, headers=auth_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_slack_interactive(client: AsyncClient, db: AsyncSession, admin_user: User):
    # Setup leave
    leave = LeaveRequest(
        user_id=admin_user.id, type="VACATION", status="PENDING", start_date=date(2026, 4, 1), end_date=date(2026, 4, 5)
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    # 1. Successful approval
    payload = {
        "actions": [{"action_id": "approve_leave", "value": f"approve_{leave.id}"}],
        "user": {"username": "test_slack_user"},
    }
    resp = await client.post("/api/v1/slack/interactive", data={"payload": json.dumps(payload)})
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    # Check leave status
    await db.refresh(leave)
    assert leave.status == "APPROVED"
    assert "Slack User" in leave.comment or "test_slack_user" in leave.comment

    # 2. Failure scenarios
    # No payload
    resp = await client.post("/api/v1/slack/interactive", data={})
    assert resp.json()["ok"] is False

    # Wrong format
    payload = {"actions": [{"action_id": "approve_leave", "value": "wrong_format"}]}
    resp = await client.post("/api/v1/slack/interactive", data={"payload": json.dumps(payload)})
    assert resp.json()["ok"] is False

    # Leave not found
    payload = {"actions": [{"action_id": "approve_leave", "value": "approve_99999"}]}
    resp = await client.post("/api/v1/slack/interactive", data={"payload": json.dumps(payload)})
    assert resp.json()["ok"] is False


@pytest.mark.asyncio
async def test_reports_advanced(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # 1. Categories
    resp = await client.get("/api/v1/reports/categories", headers=auth_headers)
    assert resp.status_code == 200

    # 2. Sprints
    resp = await client.get("/api/v1/reports/sprints", headers=auth_headers)
    assert resp.status_code == 200

    # 3. Export
    today = date.today()
    resp = await client.get(f"/api/v1/reports/export?start_date={today}&end_date={today}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    # 4. Custom report
    payload = {
        "start_date": str(today),
        "end_date": str(today),
        "group_by_rows": ["user"],
        "format": "days",
        "hours_per_day": 8.0,
    }
    resp = await client.post("/api/v1/reports/custom", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    assert "data" in resp.json()


@pytest.mark.asyncio
async def test_reports_full(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    today = date.today()
    # 1. Dashboard
    resp = await client.get(f"/api/v1/reports/dashboard?start_date={today}&end_date={today}", headers=auth_headers)
    assert resp.status_code == 200

    # 2. PM Dashboard access
    pm = User(
        email="pm_rep@ex.com", full_name="PM Rep", hashed_password=get_password_hash("pw"), role="PM", is_active=True
    )
    db.add(pm)
    await db.commit()
    login_res = await client.post("/api/v1/auth/login", data={"username": "pm_rep@ex.com", "password": "pw"})
    pm_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    resp = await client.get(f"/api/v1/reports/dashboard?start_date={today}&end_date={today}", headers=pm_headers)
    assert resp.status_code == 200

    # 3. Custom Report with filters
    payload = {
        "start_date": str(today),
        "end_date": str(today),
        "group_by_rows": ["user"],
        "user_ids": [1, 2],
        "project_id": 1,
        "sprint_ids": [1],
        "category_ids": [1],
        "worklog_types": ["JIRA", "MANUAL"],
    }
    resp = await client.post("/api/v1/reports/custom", json=payload, headers=auth_headers)
    assert resp.status_code == 200


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

    resp = await client.post(
        "/api/v1/org/units/roles",
        json={"user_id": admin_user_id, "org_unit_id": unit_id, "role_id": role_id},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assign_id = resp.json()["id"]

    resp = await client.get(f"/api/v1/org/units/{unit_id}/roles", headers=auth_headers)
    assert len(resp.json()) >= 1

    # 5. Approval Routes
    resp = await client.post(
        "/api/v1/org/units/approval-routes",
        json={"org_unit_id": unit_id, "target_type": "leave", "step_order": 1, "role_id": role_id},
        headers=auth_headers,
    )
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


@pytest.mark.asyncio
async def test_approvals_extended(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    # 1. Get my period when it exists
    today = date.today()
    start_date = today - timedelta(days=today.weekday())
    end_date = start_date + timedelta(days=6)
    period = TimesheetPeriod(user_id=admin_user.id, start_date=start_date, end_date=end_date, status="SUBMITTED")
    db.add(period)
    await db.commit()

    resp = await client.get(f"/api/v1/approvals/my-period?target_date={today}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "SUBMITTED"

    # 2. Team periods with filter
    resp = await client.get(
        f"/api/v1/approvals/team-periods?start_date={start_date}&end_date={end_date}", headers=auth_headers
    )
    assert resp.status_code == 200

    # 3. Approve multi-step
    unit = OrgUnit(name="Multi Unit")
    db.add(unit)
    await db.flush()

    # Create Role and route
    role = Role(name="Step1", is_system=True)
    db.add(role)
    await db.flush()
    route = ApprovalRoute(org_unit_id=unit.id, target_type="timesheet", step_order=1, role_id=role.id)
    db.add(route)
    await db.commit()

    # Link user to unit and role
    uor = UserOrgRole(user_id=admin_user.id, org_unit_id=unit.id, role_id=role.id)
    db.add(uor)
    await db.commit()

    # Add period for another user in this unit
    other = User(
        email="other_app@ex.com",
        full_name="Other App",
        hashed_password=get_password_hash("pw"),
        role="Employee",
        is_active=True,
    )
    db.add(other)
    await db.flush()
    ju = JiraUser(jira_account_id="ju-app", display_name="Jura", org_unit_id=unit.id)
    db.add(ju)
    await db.flush()
    other.jira_user_id = ju.id

    p2 = TimesheetPeriod(
        user_id=other.id,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 7),
        status="SUBMITTED",
        current_step_order=1,
    )
    db.add(p2)
    await db.commit()

    # Approve as admin (can approve everything)
    resp = await client.post(
        f"/api/v1/approvals/{p2.id}/approve", json={"status": "APPROVED", "comment": "OK"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "APPROVED"


@pytest.mark.asyncio
async def test_approvals_my_period_fail(client: AsyncClient, db: AsyncSession):
    # 1. No Jira linked
    unique_email = f"nojira_{uuid.uuid4()}@ex.com"
    user = User(
        email=unique_email,
        full_name="No Jira",
        hashed_password=get_password_hash("pw"),
        role="Employee",
        is_active=True,
    )
    db.add(user)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": unique_email, "password": "pw"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/v1/approvals/my-period", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "OPEN"


@pytest.mark.asyncio
async def test_timesheet_extended(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # 1. Employee stealth filter
    user = User(
        email="emp_stealth@ex.com",
        full_name="Stealth User",
        hashed_password=get_password_hash("pw"),
        role="Employee",
        is_active=True,
    )
    db.add(user)
    await db.flush()
    ju = JiraUser(jira_account_id="ju-stealth", display_name="Stealth", org_unit_id=None)
    db.add(ju)
    await db.flush()
    user.jira_user_id = ju.id

    other_ju = JiraUser(jira_account_id="ju-other", display_name="Other", org_unit_id=None)
    db.add(other_ju)
    await db.flush()

    cat = WorklogCategory(name="Stealth Category")
    db.add(cat)
    await db.flush()
    own_worklog = Worklog(date=date.today(), hours=1.0, jira_user_id=ju.id, category_id=cat.id, type="JIRA")
    other_worklog = Worklog(date=date.today(), hours=2.0, jira_user_id=other_ju.id, category_id=cat.id, type="JIRA")
    db.add(own_worklog)
    db.add(other_worklog)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_stealth@ex.com", "password": "pw"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    resp = await client.get("/api/v1/timesheet/", headers=headers)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["total"] == 1
    assert len(payload["items"]) == 1
    assert payload["items"][0]["user_name"] == "Stealth"

    # 2. My worklogs
    resp = await client.get(
        f"/api/v1/timesheet/worklogs?start_date={date.today()}&end_date={date.today()}", headers=headers
    )
    assert resp.status_code == 200

    # 3. Submit & Approve
    resp = await client.post(
        "/api/v1/timesheet/submit", json={"start_date": "2026-01-01", "end_date": "2026-01-07"}, headers=headers
    )
    assert resp.status_code == 200
    period_id = resp.json()["id"]

    # Login as admin to approve (using auth_headers fixture)
    resp = await client.post(
        f"/api/v1/timesheet/approve/{period_id}", json={"status": "APPROVED", "comment": "OK"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "APPROVED"

    # 4. Employee without jira_user_id gets empty list
    no_jira_user = User(
        email=f"emp_nojira_{uuid.uuid4()}@ex.com",
        full_name="No Jira User",
        hashed_password=get_password_hash("pw"),
        role="Employee",
        is_active=True,
        jira_user_id=None,
    )
    db.add(no_jira_user)
    await db.commit()
    no_jira_login = await client.post("/api/v1/auth/login", data={"username": no_jira_user.email, "password": "pw"})
    no_jira_headers = {"Authorization": f"Bearer {no_jira_login.json()['access_token']}"}
    no_jira_resp = await client.get("/api/v1/timesheet/", headers=no_jira_headers)
    assert no_jira_resp.status_code == 200
    no_jira_payload = no_jira_resp.json()
    assert no_jira_payload["total"] == 0
    assert no_jira_payload["items"] == []
    # 1. Refresh
    with patch("api.endpoints.projects.sync_jira_projects_to_db", return_value=5):
        resp = await client.post("/api/v1/projects/refresh", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["synced"] == 5

    # 2. Sync All
    with patch("api.endpoints.projects.queue.enqueue", new_callable=AsyncMock) as mock_enqueue:
        mock_enqueue.return_value = AsyncMock(id="job-all")
        # No active projects case (might already have some from previous tests,
        # so we can't easily guarantee 0 without clearing)
        resp = await client.post("/api/v1/projects/sync-all", headers=auth_headers)
        assert resp.status_code == 200

        # With active projects
        p = Project(jira_id="P-ACTIVE", key="ACT", name="Active", is_active=True)
        db.add(p)
        await db.commit()
        await db.refresh(p)

        resp = await client.post("/api/v1/projects/sync-all", headers=auth_headers)
        assert resp.status_code == 200

    # 3. Single Project Sync
    with patch("api.endpoints.projects.queue.enqueue", new_callable=AsyncMock) as mock_enqueue:
        mock_enqueue.return_value = AsyncMock(id="job-single")
        resp = await client.post(f"/api/v1/projects/{p.id}/sync", headers=auth_headers)
        assert resp.status_code == 200

        # 404
        resp = await client.post("/api/v1/projects/9999/sync", headers=auth_headers)
        assert resp.status_code == 404

    # 4. Sprints & Releases
    resp = await client.get(f"/api/v1/projects/{p.id}/sprints", headers=auth_headers)
    assert resp.status_code == 200

    resp = await client.get(f"/api/v1/projects/{p.id}/releases", headers=auth_headers)
    assert resp.status_code == 200

    # 5. Issues Search
    resp = await client.get("/api/v1/projects/issues?search=TEST", headers=auth_headers)
    assert resp.status_code == 200
