import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from services.timesheet import timesheet_service
from models.timesheet import Worklog, TimesheetPeriod
from datetime import date

@pytest.mark.asyncio
async def test_timesheet_approve_full():
    db = AsyncMock()
    period = TimesheetPeriod(id=1, user_id=1, status="SUBMITTED", start_date=date(2026,1,1), end_date=date(2026,1,7))
    
    def mock_update(db, db_obj, obj_in):
        for k, v in obj_in.items():
            setattr(db_obj, k, v)
        return db_obj

    with patch("services.timesheet.crud_timesheet_period.get", return_value=period), \
         patch("services.timesheet.crud_timesheet_period.update", side_effect=mock_update), \
         patch("services.timesheet.notification_service.notify_timesheet_status_change"), \
         patch("services.timesheet.log_audit"):
        
        # Test APPROVED
        res = await timesheet_service.approve_period(db, period_id=1, approver_id=2, status="APPROVED", comment="Good")
        assert res.status == "APPROVED"
