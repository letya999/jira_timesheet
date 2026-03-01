import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import Project, JiraUser, User, Issue, Worklog
from core.security import get_password_hash
from unittest.mock import patch
import uuid
import json
from datetime import date

@pytest.mark.asyncio
async def test_users_search(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    unique_name = f"John_{uuid.uuid4()}"
    u1 = User(email=f"u_{uuid.uuid4()}@ex.com", full_name=unique_name, hashed_password="pw", role="Employee", is_active=True)
    db.add(u1)
    await db.commit()
    
    resp = await client.get(f"/api/v1/users/?search={unique_name}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

@pytest.mark.asyncio
async def test_slack_interactive_logic(client: AsyncClient, db: AsyncSession):
    # Test valid but unknown action to hit more branches
    payload = {"actions": [{"action_id": "unknown", "value": "v"}], "user": {"username": "u"}}
    resp = await client.post("/api/v1/slack/interactive", data={"payload": json.dumps(payload)})
    assert resp.json()["ok"] is False

@pytest.mark.asyncio
async def test_timesheet_manual_extra(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Setup issue
    p = Project(jira_id="P-MAN2", key="MAN2", name="Manual 2", is_active=True)
    db.add(p)
    await db.flush()
    i = Issue(jira_id="I-MAN2", key="MAN2-1", summary="S", project_id=p.id)
    db.add(i)
    await db.commit()
    
    payload = {
        "date": str(date.today()),
        "hours": 1.0,
        "category": "Development",
        "description": "D",
        "issue_id": i.id
    }
    resp = await client.post("/api/v1/timesheet/manual", json=payload, headers=auth_headers)
    assert resp.status_code == 200
