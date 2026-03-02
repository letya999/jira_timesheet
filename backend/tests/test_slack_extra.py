import json
from datetime import date

import pytest
from httpx import AsyncClient
from models import LeaveRequest
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_slack_extra_endpoints(client: AsyncClient, db: AsyncSession):
    # Test slack interactive rejection
    leave = LeaveRequest(user_id=1, type="VACATION", status="PENDING", start_date=date.today(), end_date=date.today())
    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    payload = {
        "actions": [{"action_id": "reject_leave", "value": f"reject_{leave.id}"}],
        "user": {"username": "slack_user"},
    }
    resp = await client.post("/api/v1/slack/interactive", data={"payload": json.dumps(payload)})
    assert resp.status_code == 200

    await db.refresh(leave)
    assert leave.status == "REJECTED"
