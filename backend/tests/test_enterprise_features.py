import pytest
from core.config import settings
from httpx import AsyncClient
from models import AuditLog, User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_audit_log_user_update(client: AsyncClient, db: AsyncSession):
    """Test that updating a user triggers an audit log entry."""
    # Create user manually to avoid rate limiting fixture
    from core.security import get_password_hash
    from services.auth import auth_service

    admin = User(
        email="auditadmin@ex.com",
        full_name="Audit Admin",
        hashed_password=get_password_hash("pass"),
        role="Admin"
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    token = auth_service.create_access_token(data={"sub": admin.email, "role": admin.role})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Perform update via API
    new_name = "Updated Admin Name"
    response = await client.patch(
        f"/api/v1/users/{admin.id}",
        json={"full_name": new_name},
        headers=headers
    )
    assert response.status_code == 200

    # 2. Check AuditLog table
    # Force a refresh of the session to see the audit log entry
    # Actually, the listener adds to session, so after commit it should be in DB.
    result = await db.execute(
        select(AuditLog).where(AuditLog.target_id == str(admin.id), AuditLog.target_type == "User")
    )
    logs = result.scalars().all()

    # One log for UPDATE (or more if insert was logged too)
    assert len(logs) >= 1
    update_log = next((log_entry for log_entry in logs if log_entry.action == "UPDATE"), None)
    assert update_log is not None
    assert update_log.payload["changes"]["full_name"]["new"] == new_name
    assert update_log.user_id == admin.id

@pytest.mark.asyncio
async def test_rate_limiting(client: AsyncClient):
    """Test that rate limiting is working (simplified)."""
    # We use a lower limit in main.py for /login: 5 times per 60 seconds
    import os
    os.environ["TEST_RATE_LIMITING"] = "1"
    try:
        # Try multiple requests to trigger 429
        # If it's already triggered by previous tests, we might get 429 immediately.
        triggered_429 = False
        for i in range(10):
            response = await client.post(
                "/api/v1/auth/login",
                data={"username": f"user_rl_{i}@example.com", "password": "pass"}
            )
            if response.status_code == 429:
                triggered_429 = True
                break
            else:
                assert response.status_code == 401

        assert triggered_429, "Rate limit (429) was not triggered after 10 requests"
    finally:
        del os.environ["TEST_RATE_LIMITING"]

@pytest.mark.asyncio
async def test_cache_reports(client: AsyncClient, db: AsyncSession):
    """Test that report endpoints are cached."""
    # We need auth headers but WITHOUT triggering 429 for THIS test.
    # Let's wait a bit or use a separate way to get a token if possible,
    # or just use the fixture and hope it's not rate limited yet.
    # Since we use same Redis, we should be careful.

    # Wait for rate limit window if needed (not feasible in fast tests)
    # Alternatively, create a user and token manually in DB.

    from core.security import get_password_hash
    from services.auth import auth_service

    user = User(
        email="cachetest@ex.com",
        full_name="Cache Test",
        hashed_password=get_password_hash("pass"),
        role="Admin"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = auth_service.create_access_token(data={"sub": user.email, "role": user.role})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. First request
    resp1 = await client.get("/api/v1/reports/dashboard?start_date=2024-01-01&end_date=2024-01-31", headers=headers)
    assert resp1.status_code == 200

    # 2. Second request should return same data from cache
    resp2 = await client.get("/api/v1/reports/dashboard?start_date=2024-01-01&end_date=2024-01-31", headers=headers)
    assert resp2.status_code == 200
    assert resp1.json() == resp2.json()

@pytest.mark.asyncio
async def test_build_info_metric_content(client: AsyncClient):
    """Test the content of Prometheus metrics."""
    response = await client.get("/metrics")
    assert response.status_code == 200
    content = response.text
    assert "build_info" in content
    assert f'version="{settings.APP_VERSION}"' in content
    assert 'status="running"' in content
