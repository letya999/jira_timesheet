import json
from datetime import date

import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models.leave import LeaveRequest, LeaveStatus, LeaveType
from models.user import User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def setup_slack_leave(db: AsyncSession):
    employee = User(
        email="slack_emp@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="Slack Employee",
        role="Employee",
        is_active=True,
    )
    db.add(employee)
    await db.flush()

    leave = LeaveRequest(
        user_id=employee.id,
        type=LeaveType.SICK_LEAVE,
        status=LeaveStatus.PENDING,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 5),
    )
    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    return {"leave": leave}


@pytest.mark.asyncio
async def test_slack_interactive_approve(client: AsyncClient, setup_slack_leave, db: AsyncSession):
    leave = setup_slack_leave["leave"]

    # Slack sends a URL-encoded form POST with a "payload" field containing JSON
    slack_payload = {
        "user": {"username": "manager_bot"},
        "actions": [{"action_id": "approve_leave", "value": f"approve_{leave.id}"}],
    }

    response = await client.post("/api/v1/slack/interactive", data={"payload": json.dumps(slack_payload)})

    assert response.status_code == 200
    assert response.json()["ok"] is True

    # Verify in DB
    db.expunge_all()
    from sqlalchemy import select

    res = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave.id))
    updated_leave = res.scalar_one()
    assert updated_leave.status == LeaveStatus.APPROVED
    assert "Action via Slack" in updated_leave.comment


@pytest.mark.asyncio
async def test_slack_interactive_reject(client: AsyncClient, setup_slack_leave, db: AsyncSession):
    leave = setup_slack_leave["leave"]

    slack_payload = {
        "user": {"username": "manager_bot"},
        "actions": [{"action_id": "reject_leave", "value": f"reject_{leave.id}"}],
    }

    response = await client.post("/api/v1/slack/interactive", data={"payload": json.dumps(slack_payload)})

    assert response.status_code == 200
    assert response.json()["ok"] is True

    db.expunge_all()
    from sqlalchemy import select

    res = await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave.id))
    updated_leave = res.scalar_one()
    assert updated_leave.status == LeaveStatus.REJECTED
