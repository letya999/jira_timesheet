import uuid
from datetime import date

import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_sync_fail_branches(client: AsyncClient, db: AsyncSession):
    # 1. Jira user not found but linked ID exists
    email = f"user_{uuid.uuid4()}@ex.com"
    user = User(
        email=email,
        full_name="U",
        hashed_password=get_password_hash("pw"),
        role="Employee",
        is_active=True,
        jira_user_id=99999,
    )
    db.add(user)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": email, "password": "pw"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    resp = await client.post("/api/v1/sync/worklogs", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Jira user not found"


@pytest.mark.asyncio
async def test_reports_more_branches(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    today = date.today()
    # 1. Custom report with format=total
    payload = {"start_date": str(today), "end_date": str(today), "format": "total", "group_by_rows": ["project"]}
    resp = await client.post("/api/v1/reports/custom", json=payload, headers=auth_headers)
    assert resp.status_code == 200

    # 2. group_by_rows includes category
    payload["group_by_rows"] = ["user", "category"]
    resp = await client.post("/api/v1/reports/custom", json=payload, headers=auth_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_auth_inactive_user(client: AsyncClient, db: AsyncSession):
    email = f"inactive_{uuid.uuid4()}@ex.com"
    user = User(email=email, full_name="I", hashed_password=get_password_hash("pw"), role="Employee", is_active=False)
    db.add(user)
    await db.commit()

    resp = await client.post("/api/v1/auth/login", data={"username": email, "password": "pw"})
    assert resp.status_code == 400
    assert "Inactive user" in resp.json()["detail"]
