from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from models.calendar import CalendarEvent
from services.calendar import calendar_service
from services.notification import notification_service
from services.timesheet import timesheet_service


@pytest.mark.asyncio
async def test_calendar_service_extra():
    db = AsyncMock()
    with patch("services.calendar.select"):
        mock_res = MagicMock()
        mock_res.scalars.return_value.all.return_value = [CalendarEvent(date=date(2026,1,1))]
        db.execute.return_value = mock_res
        h = await calendar_service.get_holidays(db, date(2026,1,1), date(2026,1,1))
        assert len(h) >= 1

@pytest.mark.asyncio
async def test_timesheet_service_extra():
    db = AsyncMock()
    with patch("services.timesheet.select"):
        mock_res = MagicMock()
        mock_res.scalars.return_value.all.return_value = []
        db.execute.return_value = mock_res
        w = await timesheet_service.get_user_worklogs(db, user_id=1, start_date=date(2026,1,1), end_date=date(2026,1,1))
        assert isinstance(w, list)

@pytest.mark.asyncio
async def test_notification_service_extra():
    db = AsyncMock()
    with patch.object(notification_service, "create_notification") as mock_create:
        await notification_service.notify_timesheet_status_change(db, user_id=1, approver_id=2, timesheet_id=1, status="APPROVED", period_label="P")
        assert mock_create.called

@pytest.mark.asyncio
async def test_jira_service_extra():
    db = AsyncMock()
    from services.jira import get_default_category_id
    with patch("services.jira.select"):
        mock_cat = MagicMock()
        mock_cat.id = 1
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = mock_cat
        db.execute.return_value = mock_res
        cat_id = await get_default_category_id(db)
        assert cat_id == 1
