import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User, JiraUser, Notification
from core.security import get_password_hash
from unittest.mock import patch
import uuid

@pytest.mark.asyncio
async def test_notifications_mark_all(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    # 1. Create multiple notifications
    n1 = Notification(user_id=admin_user.id, title="N1", message="M1", is_read=False)
    n2 = Notification(user_id=admin_user.id, title="N2", message="M2", is_read=False)
    db.add_all([n1, n2])
    await db.commit()
    
    # 2. Mark all as read
    resp = await client.post("/api/v1/notifications/mark-all-read", headers=auth_headers)
    assert resp.status_code == 200
    
    # 3. Check stats
    resp = await client.get("/api/v1/notifications/stats", headers=auth_headers)
    assert resp.json()["unread_count"] == 0

@pytest.mark.asyncio
async def test_slack_missing_payload(client: AsyncClient):
    # 1. No payload
    resp = await client.post("/api/v1/slack/interactive", data={})
    assert resp.json()["ok"] is False

@pytest.mark.asyncio
async def test_crud_project_extra(db: AsyncSession):
    from crud.project import project as crud_project
    from schemas.project import ProjectCreate
    
    # Create with extra data
    p = await crud_project.create(db, obj_in=ProjectCreate(jira_id="PX", key="PX", name="PX", is_active=True))
    assert p.id is not None
    
    # Get multi
    items = await crud_project.get_multi(db, limit=1)
    assert len(items) <= 1
