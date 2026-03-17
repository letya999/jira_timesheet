import pytest
from unittest.mock import MagicMock
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from core.audit import log_audit
from models.audit import AuditLog
from models.user import User

@pytest.mark.asyncio
async def test_log_audit_creates_record(db: AsyncSession):
    await log_audit(
        db, 
        action="test.action", 
        target_type="User", 
        target_id="1", 
        user_id=1
    )
    await db.commit()
    
    result = await db.execute(select(AuditLog).where(AuditLog.action == "test.action"))
    record = result.scalar_one()
    assert record.action == "test.action"
    assert record.target_type == "User"
    assert record.target_id == "1"
    assert record.user_id == 1

@pytest.mark.asyncio
async def test_log_audit_with_payload(db: AsyncSession):
    payload = {"key": "value"}
    await log_audit(
        db, 
        action="test.payload", 
        target_type="User", 
        payload=payload
    )
    await db.commit()
    
    result = await db.execute(select(AuditLog).where(AuditLog.action == "test.payload"))
    record = result.scalar_one()
    assert record.payload == payload

@pytest.mark.asyncio
async def test_log_audit_with_request_ip(db: AsyncSession):
    mock_request = MagicMock()
    # Mocking request.client.host
    mock_request.client = MagicMock()
    mock_request.client.host = "192.168.1.1"
    
    await log_audit(
        db, 
        action="test.ip", 
        target_type="User", 
        request=mock_request
    )
    await db.commit()
    
    result = await db.execute(select(AuditLog).where(AuditLog.action == "test.ip"))
    record = result.scalar_one()
    assert record.ip_address == "192.168.1.1"

@pytest.mark.asyncio
async def test_log_audit_without_user_id(db: AsyncSession):
    await log_audit(
        db, 
        action="test.anonymous", 
        target_type="User"
    )
    await db.commit()
    
    result = await db.execute(select(AuditLog).where(AuditLog.action == "test.anonymous"))
    record = result.scalar_one()
    assert record.user_id is None

@pytest.mark.asyncio
async def test_audit_log_via_endpoint(client: AsyncClient, db: AsyncSession, admin_user: User, auth_headers: dict):
    # We use timesheet submission as it's known to trigger audit logging
    # First we need a period to submit or just call it and it will create one
    payload = {
        "start_date": "2024-01-01",
        "end_date": "2024-01-07"
    }
    response = await client.post(
        "/api/v1/timesheet/submit",
        json=payload,
        headers=auth_headers
    )
    assert response.status_code == 200
    
    # Check if AuditLog record was created
    result = await db.execute(
        select(AuditLog).where(AuditLog.action == "SUBMIT_TIMESHEET")
    )
    record = result.scalar_one_or_none()
    assert record is not None
    assert record.user_id == admin_user.id
    assert record.target_type == "TimesheetPeriod"
