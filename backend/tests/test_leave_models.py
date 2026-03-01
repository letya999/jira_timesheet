import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from models.user import User
from models.leave import LeaveRequest, LeaveType, LeaveStatus
from core.security import get_password_hash
from datetime import date, datetime

@pytest.mark.asyncio
async def test_create_leave_request(db: AsyncSession):
    # Setup test user
    user = User(
        email="leave_user@example.com",
        hashed_password=get_password_hash("password"),
        full_name="Leave User",
        role="Employee"
    )
    db.add(user)
    await db.flush()

    approver = User(
        email="leave_approver@example.com",
        hashed_password=get_password_hash("password"),
        full_name="Leave Approver",
        role="PM"
    )
    db.add(approver)
    await db.flush()

    # Create LeaveRequest
    leave_req = LeaveRequest(
        user_id=user.id,
        type=LeaveType.VACATION,
        status=LeaveStatus.PENDING,
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 14),
        reason="Summer vacation",
        approver_id=approver.id
    )
    db.add(leave_req)
    await db.commit()
    await db.refresh(leave_req)

    assert leave_req.id is not None
    assert leave_req.user_id == user.id
    assert leave_req.approver_id == approver.id
    assert leave_req.type == LeaveType.VACATION
    assert leave_req.status == LeaveStatus.PENDING
    assert leave_req.reason == "Summer vacation"
