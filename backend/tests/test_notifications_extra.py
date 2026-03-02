import pytest
from httpx import AsyncClient
from models import User
from models.notification import Notification
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_notifications_extra(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    # 1. Create notification
    n = Notification(user_id=admin_user.id, title="Extra", message="Msg")
    db.add(n)
    await db.commit()

    # 2. Get unread count
    resp = await client.get("/api/v1/notifications/stats", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["unread_count"] >= 1

    # 3. Mark all read
    resp = await client.post("/api/v1/notifications/mark-all-read", headers=auth_headers)
    assert resp.status_code == 200
