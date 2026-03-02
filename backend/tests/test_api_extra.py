from datetime import date

import pytest
from httpx import AsyncClient
from models import OrgUnit, User
from models.leave import LeaveRequest
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_approvals_extreme_branches(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    # 1. Get team periods with ORG UNIT and dates
    today = date.today()
    unit = OrgUnit(name="Ext Unit")
    db.add(unit)
    await db.commit()

    resp = await client.get(
        f"/api/v1/approvals/team-periods?start_date={today}&end_date={today}&org_unit_id={unit.id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_leave_extreme_branches(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # 1. Get all leaves with multiple filters
    resp = await client.get("/api/v1/leaves/all?status=PENDING&user_id=1&org_unit_id=1", headers=auth_headers)
    assert resp.status_code == 200

    # 2. Rejection branch
    leave = LeaveRequest(user_id=1, type="VACATION", status="PENDING", start_date=date.today(), end_date=date.today())
    db.add(leave)
    await db.commit()

    resp = await client.patch(
        f"/api/v1/leaves/{leave.id}", json={"status": "REJECTED", "comment": "No"}, headers=auth_headers
    )
    assert resp.status_code == 200

    # 3. Already acted upon check
    resp = await client.patch(f"/api/v1/leaves/{leave.id}", json={"status": "APPROVED"}, headers=auth_headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_metrics_endpoint(client: AsyncClient):
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert "build_info" in response.text


@pytest.mark.asyncio
async def test_sso_login_not_configured(client: AsyncClient):
    # By default, SSO is not configured in tests unless we set env vars
    response = await client.get("/api/v1/auth/sso/login")
    # If not configured, it returns 501 Not Implemented
    assert response.status_code == 501
