from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from models.calendar import CalendarEvent
from models.timesheet import TimesheetPeriod
from models.user import JiraUser, User
from services.calendar import calendar_service
from services.jira import (
    fetch_issue_details,
    sync_jira_users_to_db,
    sync_user_worklogs,
)
from services.notification import notification_service
from services.slack import slack_service
from services.timesheet import timesheet_service


@pytest.mark.asyncio
async def test_calendar_service_get_holidays():
    db = AsyncMock()
    mock_events = [CalendarEvent(date=date(2026, 1, 1), name="New Year", is_holiday=True)]
    with patch("services.calendar.select"):
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_events
        db.execute.return_value = mock_result
        holidays = await calendar_service.get_holidays(db, date(2026, 1, 1), date(2026, 12, 31))
        assert len(holidays) == 1


@pytest.mark.asyncio
async def test_calendar_service_is_working_day():
    db = AsyncMock()
    assert await calendar_service.is_working_day(db, date(2026, 3, 7)) is False
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_res
    assert await calendar_service.is_working_day(db, date(2026, 3, 9)) is True


@pytest.mark.asyncio
async def test_calendar_service_get_working_days_count():
    db = AsyncMock()
    with patch.object(
        calendar_service, "get_holidays", return_value=[CalendarEvent(date=date(2026, 3, 4), is_holiday=True)]
    ):
        count = await calendar_service.get_working_days_count(db, date(2026, 3, 2), date(2026, 3, 8))
        assert count == 4


@pytest.mark.asyncio
async def test_timesheet_service_submit_period():
    db = AsyncMock()
    user = User(id=1, full_name="Test User", email="test@ex.com")
    mock_period = TimesheetPeriod(
        id=1, user_id=1, status="DRAFT", start_date=date(2026, 1, 1), end_date=date(2026, 1, 7)
    )
    with (
        patch("services.timesheet.crud_timesheet_period.get_by_user_and_date", return_value=mock_period),
        patch("services.timesheet.crud_timesheet_period.update", side_effect=lambda db, db_obj, obj_in: db_obj),
        patch("services.timesheet.notification_service.notify_timesheet_submitted"),
        patch("services.timesheet.log_audit"),
    ):
        mock_user_res = MagicMock()
        mock_user_res.scalar_one.return_value = user
        db.execute.return_value = mock_user_res
        res = await timesheet_service.submit_period(
            db, user_id=1, start_date=date(2026, 1, 1), end_date=date(2026, 1, 7)
        )
        assert res.id == 1


@pytest.mark.asyncio
async def test_notification_service_create():
    db = AsyncMock()
    n = await notification_service.create_notification(db, user_id=1, title="T", message="M")
    assert n.user_id == 1


@pytest.mark.asyncio
async def test_slack_service_send_message():
    with patch("services.slack.settings") as mock_settings, patch("httpx.AsyncClient.post") as mock_post:
        mock_settings.SLACK_BOT_TOKEN = "test-token"
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"ok": True})
        res = await slack_service.send_message("C123", "Hello")
        assert res is True


@pytest.mark.asyncio
async def test_jira_service_fetch_issue_details():
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "issues": [
                    {
                        "id": "100",
                        "key": "PROJ-1",
                        "fields": {
                            "project": {"id": "1", "key": "PROJ", "name": "Project"},
                            "summary": "Task 1",
                            "status": {"name": "In Progress"},
                            "issuetype": {"name": "Bug"},
                        },
                    }
                ]
            },
        )
        res = await fetch_issue_details(["100"])
        assert "100" in res


@pytest.mark.asyncio
async def test_jira_service_sync_users():
    db = AsyncMock()
    with patch(
        "services.jira.fetch_jira_users",
        return_value=[
            {"accountId": "acc-1", "accountType": "atlassian", "displayName": "User 1", "emailAddress": "u1@ex.com"}
        ],
    ):
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_res
        count = await sync_jira_users_to_db(db)
        assert count == 1


@pytest.mark.asyncio
async def test_jira_service_sync_worklogs():
    db = AsyncMock()
    jira_user = JiraUser(id=1, jira_account_id="acc-1", display_name="User 1")
    with patch("services.jira.fetch_issue_details", return_value={}):
        # Mock worklogs fetch
        with patch("services.jira.httpx.AsyncClient.get") as mock_get:
            mock_get.return_value = MagicMock(status_code=200, json=lambda: {"worklogs": []})
            await sync_user_worklogs(jira_user, db, days=1)
            assert True  # Just check it doesn't crash


@pytest.mark.asyncio
async def test_jira_service_sync_worklogs_for_projects():
    db = AsyncMock()
    # Use sync_jira_worklogs which is available
    from services.jira import sync_jira_worklogs

    with patch("services.jira.sync_user_worklogs"):
        await sync_jira_worklogs(db, since=0)
        assert True
