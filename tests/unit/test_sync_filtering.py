"""Unit tests for jira worklog sync filtering and pagination logic."""
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_worklog(worklog_id: str, issue_id: str, account_id: str = "user1") -> dict:
    return {
        "id": worklog_id,
        "issueId": issue_id,
        "author": {"accountId": account_id, "displayName": "Test User"},
        "timeSpentSeconds": 3600,
        "started": "2026-01-15T09:00:00.000+0000",
        "created": "2026-01-15T09:00:00.000+0000",
        "comment": {},
    }


def _make_issue_data(project_jira_id: str, project_key: str) -> dict:
    return {
        "jira_id": "100",
        "key": f"{project_key}-1",
        "project_id": project_jira_id,
        "project_key": project_key,
        "project_name": f"Project {project_key}",
        "summary": "Test issue",
        "status": "In Progress",
        "issue_type_name": "Task",
        "issue_type_id": "1",
        "issue_type_icon": None,
        "issue_type_subtask": False,
        "parent_id": None,
        "releases": [],
        "sprints": [],
    }


def _make_updated_page(worklog_ids: list[int], until: int = 9999, last_page: bool = True) -> dict:
    return {
        "values": [{"worklogId": wid} for wid in worklog_ids],
        "since": 0,
        "until": until,
        "lastPage": last_page,
    }


# ---------------------------------------------------------------------------
# Tests: active_jira_ids whitelist filtering
# ---------------------------------------------------------------------------

class TestSyncJiraWorklogsFiltering:
    """Verify that only whitelisted project worklogs are saved to DB."""

    @pytest.mark.asyncio
    async def test_worklogs_for_inactive_project_are_skipped(self):
        """Worklogs whose project_id is not in allowed set must not be saved."""
        from unittest.mock import AsyncMock, MagicMock, patch

        active_project_jira_id = "10001"
        inactive_project_jira_id = "10002"

        worklogs = [
            _make_worklog("w1", "issue-A"),  # active project
            _make_worklog("w2", "issue-B"),  # inactive project
        ]
        issue_map = {
            "issue-A": _make_issue_data(active_project_jira_id, "ACTIVE"),
            "issue-B": _make_issue_data(inactive_project_jira_id, "INACTIVE"),
        }

        saved_worklogs = []

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.commit = AsyncMock()

        def mock_add(obj):
            saved_worklogs.append(obj)

        mock_db.add = mock_add

        with (
            patch("services.jira.fetch_issue_details", return_value=issue_map),
            patch("services.jira.get_default_category_id", return_value=1),
            patch("services.jira.system_settings") as mock_settings,
            patch("services.jira._ensure_entities_exist") as mock_ensure,
            patch("services.jira._update_issue_releases", return_value=None),
            patch("services.jira._update_issue_sprints", return_value=None),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.get = AsyncMock(return_value=None)
            mock_settings.set = AsyncMock()

            # _ensure_entities_exist returns a valid tuple for active project only
            async def ensure_side_effect(db, item, iss_data):
                if iss_data["project_id"] == active_project_jira_id:
                    jira_user = MagicMock(id=1)
                    project = MagicMock(id=1)
                    issue = MagicMock(id=1)
                    return jira_user, project, issue
                return None  # should not be reached due to whitelist filter

            mock_ensure.side_effect = ensure_side_effect

            # Mock existing worklog lookup — return None (new worklog)
            mock_scalar = MagicMock()
            mock_scalar.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_scalar

            # Mock HTTP responses
            mock_resp_updated = MagicMock()
            mock_resp_updated.raise_for_status = MagicMock()
            mock_resp_updated.json.return_value = _make_updated_page([1, 2])

            mock_resp_list = MagicMock()
            mock_resp_list.raise_for_status = MagicMock()
            mock_resp_list.json.return_value = worklogs

            mock_http = AsyncMock()
            mock_http.get = AsyncMock(return_value=mock_resp_updated)
            mock_http.post = AsyncMock(return_value=mock_resp_list)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            from services.jira import sync_jira_worklogs

            result = await sync_jira_worklogs(
                mock_db,
                since=0,
                allowed_project_jira_ids={active_project_jira_id},
            )

        assert result["status"] == "success"
        assert result["synced"] == 1, "Only 1 worklog from active project should be saved"
        assert len(saved_worklogs) == 1

    @pytest.mark.asyncio
    async def test_all_worklogs_skipped_when_whitelist_empty(self):
        """With empty whitelist (no active projects), nothing should be synced."""
        from services.jira import sync_jira_worklogs

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()

        with patch("services.jira.system_settings") as mock_settings:
            mock_settings.get = AsyncMock(return_value=None)

            result = await sync_jira_worklogs(
                mock_db,
                since=0,
                allowed_project_jira_ids=set(),  # empty → no active projects
            )

        assert result["status"] == "success"
        assert result["synced"] == 0

    @pytest.mark.asyncio
    async def test_single_project_id_creates_whitelist_of_one(self):
        """When project_id is set, only that project's worklogs must be synced."""
        single_project_id = "10001"
        other_project_id = "10002"

        worklogs = [
            _make_worklog("w1", "issue-A"),  # belongs to single_project_id
            _make_worklog("w2", "issue-B"),  # belongs to other_project_id — must be skipped
        ]
        issue_map = {
            "issue-A": _make_issue_data(single_project_id, "PROJ"),
            "issue-B": _make_issue_data(other_project_id, "OTHER"),
        }

        saved = []

        mock_db = AsyncMock()
        mock_scalar = MagicMock()
        mock_scalar.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_scalar)
        mock_db.add = lambda obj: saved.append(obj)
        mock_db.flush = AsyncMock()
        mock_db.commit = AsyncMock()

        with (
            patch("services.jira.fetch_issue_details", return_value=issue_map),
            patch("services.jira.get_default_category_id", return_value=1),
            patch("services.jira.system_settings") as mock_settings,
            patch("services.jira._ensure_entities_exist") as mock_ensure,
            patch("services.jira._update_issue_releases", return_value=None),
            patch("services.jira._update_issue_sprints", return_value=None),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.get = AsyncMock(return_value=None)
            mock_settings.set = AsyncMock()

            async def ensure_side_effect(db, item, iss_data):
                return MagicMock(id=1), MagicMock(id=1), MagicMock(id=1)

            mock_ensure.side_effect = ensure_side_effect

            mock_resp_updated = MagicMock()
            mock_resp_updated.raise_for_status = MagicMock()
            mock_resp_updated.json.return_value = _make_updated_page([1, 2])

            mock_resp_list = MagicMock()
            mock_resp_list.raise_for_status = MagicMock()
            mock_resp_list.json.return_value = worklogs

            mock_http = AsyncMock()
            mock_http.get = AsyncMock(return_value=mock_resp_updated)
            mock_http.post = AsyncMock(return_value=mock_resp_list)
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            from services.jira import sync_jira_worklogs

            result = await sync_jira_worklogs(mock_db, since=0, project_id=single_project_id)

        assert result["synced"] == 1


# ---------------------------------------------------------------------------
# Tests: pagination
# ---------------------------------------------------------------------------

class TestSyncJiraWorklogsPagination:
    """Verify that /worklog/updated is paginated correctly."""

    @pytest.mark.asyncio
    async def test_paginated_response_fetches_all_pages(self):
        """When lastPage=false, the function must request the next page."""
        project_id = "10001"

        # Page 1: 2 worklogs, not the last page
        page1_ids = [1, 2]
        page1_worklogs = [_make_worklog(str(i), f"issue-{i}") for i in page1_ids]

        # Page 2: 1 worklog, last page
        page2_ids = [3]
        page2_worklogs = [_make_worklog("3", "issue-3")]

        issue_map = {
            f"issue-{i}": _make_issue_data(project_id, "PROJ") for i in [1, 2, 3]
        }
        for k in issue_map:
            issue_map[k] = _make_issue_data(project_id, "PROJ")

        saved = []
        mock_db = AsyncMock()
        mock_scalar = MagicMock()
        mock_scalar.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_scalar)
        mock_db.add = lambda obj: saved.append(obj)
        mock_db.flush = AsyncMock()
        mock_db.commit = AsyncMock()

        get_call_count = 0

        async def mock_get(url, params=None):
            nonlocal get_call_count
            get_call_count += 1
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            if get_call_count == 1:
                resp.json.return_value = _make_updated_page(page1_ids, until=1000, last_page=False)
            else:
                resp.json.return_value = _make_updated_page(page2_ids, until=2000, last_page=True)
            return resp

        async def mock_post(url, json=None):
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            ids = json.get("ids", [])
            wl = page1_worklogs if 1 in ids else page2_worklogs
            resp.json.return_value = wl
            return resp

        with (
            patch("services.jira.fetch_issue_details", return_value=issue_map),
            patch("services.jira.get_default_category_id", return_value=1),
            patch("services.jira.system_settings") as mock_settings,
            patch("services.jira._ensure_entities_exist") as mock_ensure,
            patch("services.jira._update_issue_releases", return_value=None),
            patch("services.jira._update_issue_sprints", return_value=None),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.get = AsyncMock(return_value=None)
            mock_settings.set = AsyncMock()

            async def ensure_side_effect(db, item, iss_data):
                return MagicMock(id=1), MagicMock(id=1), MagicMock(id=1)

            mock_ensure.side_effect = ensure_side_effect

            mock_http = AsyncMock()
            mock_http.get = mock_get
            mock_http.post = mock_post
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            from services.jira import sync_jira_worklogs

            result = await sync_jira_worklogs(
                mock_db,
                since=0,
                allowed_project_jira_ids={project_id},
            )

        assert get_call_count == 2, "Should have made 2 GET requests (2 pages)"
        assert result["synced"] == 3, "All 3 worklogs across 2 pages should be synced"

    @pytest.mark.asyncio
    async def test_timestamp_saved_after_each_page(self):
        """The since timestamp must be saved to DB after each page, not just at the end."""
        project_id = "10001"

        set_calls = []

        mock_db = AsyncMock()
        mock_scalar = MagicMock()
        mock_scalar.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_scalar)
        mock_db.add = lambda obj: None
        mock_db.flush = AsyncMock()
        mock_db.commit = AsyncMock()

        get_call_count = 0

        async def mock_get(url, params=None):
            nonlocal get_call_count
            get_call_count += 1
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            if get_call_count == 1:
                resp.json.return_value = _make_updated_page([1], until=1000, last_page=False)
            else:
                resp.json.return_value = _make_updated_page([2], until=2000, last_page=True)
            return resp

        async def mock_post(url, json=None):
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            ids = json.get("ids", [])
            resp.json.return_value = [_make_worklog(str(ids[0]), f"issue-{ids[0]}")]
            return resp

        issue_map = {f"issue-{i}": _make_issue_data(project_id, "PROJ") for i in [1, 2]}

        with (
            patch("services.jira.fetch_issue_details", return_value=issue_map),
            patch("services.jira.get_default_category_id", return_value=1),
            patch("services.jira.system_settings") as mock_settings,
            patch("services.jira._ensure_entities_exist") as mock_ensure,
            patch("services.jira._update_issue_releases", return_value=None),
            patch("services.jira._update_issue_sprints", return_value=None),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.get = AsyncMock(return_value=None)

            async def record_set(db, key, value):
                set_calls.append((key, value))

            mock_settings.set = record_set

            async def ensure_side_effect(db, item, iss_data):
                return MagicMock(id=1), MagicMock(id=1), MagicMock(id=1)

            mock_ensure.side_effect = ensure_side_effect

            mock_http = AsyncMock()
            mock_http.get = mock_get
            mock_http.post = mock_post
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            from services.jira import sync_jira_worklogs

            result = await sync_jira_worklogs(
                mock_db,
                since=0,
                allowed_project_jira_ids={project_id},
            )

        assert len(set_calls) == 2, "Timestamp must be saved after each page"
        assert set_calls[0][1]["timestamp"] == 1000
        assert set_calls[1][1]["timestamp"] == 2000


# ---------------------------------------------------------------------------
# Tests: _ensure_entities_exist returns None for unknown projects
# ---------------------------------------------------------------------------

class TestEnsureEntitiesExist:
    """Verify _ensure_entities_exist returns None when project not in DB."""

    @pytest.mark.asyncio
    async def test_returns_none_when_project_not_in_db(self):
        """Unknown project → None returned, no new Project created."""
        from services.jira import _ensure_entities_exist

        mock_db = AsyncMock()
        created_objects = []
        mock_db.add = lambda obj: created_objects.append(obj)
        mock_db.flush = AsyncMock()

        # JiraUser query: found
        jira_user_mock = MagicMock()
        jira_user_mock.id = 1

        # Scalar results: user found, project NOT found
        scalar_results = [jira_user_mock, None]
        call_count = 0

        async def mock_execute(stmt):
            nonlocal call_count
            result = MagicMock()
            result.scalar_one_or_none.return_value = scalar_results[min(call_count, 1)]
            call_count += 1
            return result

        mock_db.execute = mock_execute

        item = {
            "issueId": "issue-1",
            "author": {"accountId": "user1", "displayName": "Test User"},
        }
        iss_data = _make_issue_data("99999", "UNKNOWN")

        result = await _ensure_entities_exist(mock_db, item, iss_data)

        assert result is None
        # No Project objects should have been added
        from models.project import Project
        project_objects = [o for o in created_objects if isinstance(o, Project)]
        assert len(project_objects) == 0


# ---------------------------------------------------------------------------
# Tests: scalability with 100 projects
# ---------------------------------------------------------------------------

class TestSyncScalabilityWith100Projects:
    """Verify the sync approach scales to 100 projects with O(1) Jira API calls."""

    @pytest.mark.asyncio
    async def test_single_api_call_regardless_of_project_count(self):
        """sync_jira_worklogs makes only 1 GET call to /worklog/updated even with 100 projects."""
        # 100 active project jira IDs
        active_ids = {str(i) for i in range(100)}

        # 5 worklogs — some from active projects, some not
        worklogs = [
            _make_worklog("w1", "issue-1"),  # project 0 — active
            _make_worklog("w2", "issue-2"),  # project 1 — active
            _make_worklog("w3", "issue-3"),  # project 200 — inactive
        ]
        issue_map = {
            "issue-1": _make_issue_data("0", "P0"),
            "issue-2": _make_issue_data("1", "P1"),
            "issue-3": _make_issue_data("200", "INACTIVE"),
        }

        get_call_count = 0
        saved = []
        mock_db = AsyncMock()
        mock_scalar = MagicMock()
        mock_scalar.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_scalar)
        mock_db.add = lambda obj: saved.append(obj)
        mock_db.flush = AsyncMock()
        mock_db.commit = AsyncMock()

        async def mock_get(url, params=None):
            nonlocal get_call_count
            get_call_count += 1
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            resp.json.return_value = _make_updated_page([1, 2, 3], last_page=True)
            return resp

        with (
            patch("services.jira.fetch_issue_details", return_value=issue_map),
            patch("services.jira.get_default_category_id", return_value=1),
            patch("services.jira.system_settings") as mock_settings,
            patch("services.jira._ensure_entities_exist") as mock_ensure,
            patch("services.jira._update_issue_releases", return_value=None),
            patch("services.jira._update_issue_sprints", return_value=None),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.get = AsyncMock(return_value=None)
            mock_settings.set = AsyncMock()

            async def ensure_side_effect(db, item, iss_data):
                return MagicMock(id=1), MagicMock(id=1), MagicMock(id=1)

            mock_ensure.side_effect = ensure_side_effect

            mock_http = AsyncMock()
            mock_http.get = mock_get
            mock_http.post = AsyncMock(return_value=MagicMock(
                raise_for_status=MagicMock(),
                json=MagicMock(return_value=worklogs),
            ))
            mock_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_http)
            mock_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

            from services.jira import sync_jira_worklogs

            result = await sync_jira_worklogs(mock_db, since=0, allowed_project_jira_ids=active_ids)

        assert get_call_count == 1, "Only ONE Jira API call regardless of 100 active projects"
        assert result["synced"] == 2, "Only worklogs for active projects should be saved"
