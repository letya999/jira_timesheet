from unittest.mock import AsyncMock, patch

import pytest
from core.worker import queue
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_jira_webhook_received(client: AsyncClient):
    # Mock queue.enqueue
    with patch.object(queue, "enqueue", new_callable=AsyncMock) as mock_enqueue:
        webhook_payload = {
            "webhookEvent": "worklog_created",
            "worklog": {
                "id": "12345"
            }
        }
        response = await client.post("/api/v1/sync/webhooks/jira", json=webhook_payload)

        assert response.status_code == 200
        assert response.json() == {"status": "webhook_received", "event": "worklog_created", "worklog_id": "12345"}

        # Verify task was enqueued
        mock_enqueue.assert_called_once_with("task_sync_specific_worklogs", worklog_ids=["12345"])

@pytest.mark.asyncio
async def test_jira_webhook_ignored(client: AsyncClient):
    webhook_payload = {
        "webhookEvent": "jira:issue_updated",
        "issue": {"id": "1000"}
    }
    response = await client.post("/api/v1/sync/webhooks/jira", json=webhook_payload)

    assert response.status_code == 200
    assert response.json()["status"] == "ignored"

@pytest.mark.asyncio
async def test_task_sync_all_projects_enqueues_individual_syncs():
    # We need to mock the database session and the queue
    from unittest.mock import MagicMock

    from core.worker import task_sync_all_projects
    from models.project import Project
    with patch("core.worker.async_session") as mock_session_cm, \
         patch("core.worker.queue", new_callable=AsyncMock) as mock_queue, \
         patch("core.worker.sync_jira_projects_to_db", new_callable=AsyncMock) as mock_sync_meta:

        mock_db = AsyncMock()
        mock_session_cm.return_value.__aenter__.return_value = mock_db

        # Mock active projects
        project1 = Project(id=1, key="P1", is_active=True)
        project2 = Project(id=2, key="P2", is_active=True)

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [project1, project2]
        mock_db.execute.return_value = mock_result

        result = await task_sync_all_projects(None)

        assert result["status"] == "project_syncs_enqueued"
        assert result["count"] == 2

        # Verify metadata sync was called
        mock_sync_meta.assert_called_once_with(mock_db, only_keys=["P1", "P2"])

        # Verify individual project syncs were enqueued
        assert mock_queue.enqueue.call_count == 2
        mock_queue.enqueue.assert_any_call("task_sync_project", project_id=1)
        mock_queue.enqueue.assert_any_call("task_sync_project", project_id=2)
