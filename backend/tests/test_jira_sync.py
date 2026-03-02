from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from services.jira import (
    sync_jira_projects_to_db,
)


@pytest.mark.asyncio
async def test_sync_jira_projects_full():
    db = AsyncMock()
    # Mock Jira calls
    with (
        patch("services.jira.fetch_jira_projects", return_value=[{"id": "p1", "key": "P1", "name": "Project 1"}]),
        patch(
            "services.jira.fetch_jira_project_versions",
            return_value=[{"id": "v1", "name": "v1", "released": True, "releaseDate": "2026-01-01"}],
        ),
        patch(
            "services.jira.fetch_jira_project_sprints",
            return_value=[
                {
                    "id": 1,
                    "name": "S1",
                    "state": "active",
                    "startDate": "2026-01-01",
                    "endDate": "2026-01-14",
                    "originBoardId": 1,
                }
            ],
        ),
    ):
        # Mock DB
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = None  # No existing project
        db.execute.return_value = mock_res

        await sync_jira_projects_to_db(db)
        assert db.add.called
        # Check if it tried to add Project, Version, Sprint
        assert db.add.call_count >= 1
