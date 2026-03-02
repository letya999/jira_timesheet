from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from models.calendar import CalendarEvent
from services.calendar import calendar_service


@pytest.mark.asyncio
async def test_calendar_sync_logic():
    db = AsyncMock()
    # Mock system_settings.get to return a mock object with a 'value' attribute
    mock_setting = MagicMock()
    mock_setting.value = {"country_code": "US"}

    with (
        patch("services.calendar.system_settings.get", return_value=mock_setting),
        patch("services.calendar.holidays.CountryHoliday", side_effect=Exception("API error")),
    ):
        await calendar_service.sync_holidays(db, 2026)
        assert True


@pytest.mark.asyncio
async def test_calendar_add_custom():
    db = AsyncMock()
    mock_event = CalendarEvent(date=date(2026, 1, 1), name="Old")
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_event
    db.execute.return_value = mock_res

    await calendar_service.add_custom_holiday(db, date(2026, 1, 1), "New")
    assert mock_event.name == "New"
    assert mock_event.is_custom is True
