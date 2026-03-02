from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from models import JiraUser
from services.jira import sync_jira_worklogs, sync_user_worklogs


@pytest.mark.asyncio
async def test_sync_jira_worklogs_full():
    db = AsyncMock()
    with patch("httpx.AsyncClient.get") as mock_get, \
         patch("httpx.AsyncClient.post") as mock_post, \
         patch("services.jira.fetch_issue_details") as mock_fetch_iss, \
         patch("services.jira.get_default_category_id", return_value=1):

        # 1. Mock updated IDs
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"values": [{"worklogId": "w1"}]})

        # 2. Mock worklog list details
        worklog_data = {
            "id": "w1", "issueId": "i1", "timeSpentSeconds": 3600, "started": "2026-01-01T10:00:00.000+0000",
            "created": "2026-01-01T10:00:00.000+0000",
            "author": {"accountId": "a1", "displayName": "Author"},
            "comment": "Work"
        }
        mock_post.return_value = MagicMock(status_code=200, json=lambda: [worklog_data])

        # 3. Mock issue mapping
        mock_fetch_iss.return_value = {
            "i1": {"project_id": "p1", "project_key": "P1", "project_name": "P1", "key": "P1-1", "summary": "S", "status": "O", "issue_type": "T"}
        }

        # 4. Mock DB lookups (scalars().one_or_none())
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = None # No JiraUser, No Project, No Issue, No Worklog
        db.execute.return_value = mock_res

        res = await sync_jira_worklogs(db)
        assert res["status"] == "success"
        assert res["synced"] == 1

@pytest.mark.asyncio
async def test_sync_user_worklogs_error_handling():
    db = AsyncMock()
    jira_user = JiraUser(id=1, jira_account_id="acc-1", display_name="U")
    with patch("httpx.AsyncClient.get", side_effect=Exception("Jira error")):
        await sync_user_worklogs(jira_user, db)
        assert True
