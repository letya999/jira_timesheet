# Proposal: Sync and Store Jira Issue Types

## Why
Currently, Jira issue types are stored only as strings in the `issues` table. To provide a richer user interface and better data categorization, we need to store full information about issue types, including their Jira IDs, names, and icon URLs. This will allow the frontend to display the correct icons and facilitate filtering by issue type.

## What Changes
- **Database Schema**:
  - Add `IssueType` model to store `jira_id`, `name`, `icon_url`, and `is_subtask`.
  - Update `Issue` model to use a foreign key to `IssueType` instead of a plain string.
- **Jira Service**:
  - Update the synchronization logic to fetch and store issue type details.
  - Ensure issue types are cached or synced efficiently during the issue sync process.
- **API/Schemas**:
  - Update Issue schemas to include nested issue type information.

## Impact
- **Database**: Migration required for the `issues` table to transition from string-based `issue_type` to foreign key.
- **Sync Performance**: Minimal impact, as issue types can be cached during a sync run.
- **Frontend**: API response for issues will now contain richer issue type information.
