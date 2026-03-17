# Proposal: add-report-builder-issue-dimensions

## Why

The current Pivot Configuration in the Report Builder offers a `task` dimension that maps directly to `w.issue.summary`. This is insufficient for users who need:
- A direct navigable reference to the Jira issue (clickable link via issue key)
- A meaningful task name for manually-logged worklogs (which carry a free-text `description`, not a Jira summary)
- The Jira issue type (Bug, Story, Task, Epic, Sub-task) as a grouping/filtering axis

These three fields enable grouping reports by issue type, navigating directly to Jira tasks, and correctly labeling manual worklogs.

## What Changes

- **Backend** `backend/api/endpoints/reports.py`:
  - Add `joinedload(Issue.issue_type_obj)` to the eager-load chain in `GET /custom`
  - Add three new fields to each worklog row in the response:
    - `issue_link`: full Jira browse URL (`{JIRA_URL}/browse/{issue.key}`), or `"N/A"` if no issue
    - `issue_name`: for `type == "MANUAL"` use `w.description` if non-empty, else `w.issue.summary`; for JIRA type use `w.issue.summary`; `"N/A"` if no issue and no description
    - `issue_type`: `w.issue.issue_type_obj.name` if available, else `w.issue.issue_type` string, else `"N/A"`

- **Frontend** `web/src/features/reports/components/pivot-config-panel.tsx`:
  - Add `issue_link`, `issue_name`, `issue_type` to `PIVOT_DIMENSIONS` array

- **Frontend** `web/src/features/reports/components/report-data-table.tsx`:
  - Render `issue_link` dimension cells as `<a href={value} target="_blank">` with display text = issue key extracted from URL (last path segment)

- **i18n** `en.json` and `ru.json`:
  - Add `issue_link`, `issue_name`, `issue_type` keys to `web.reports.dimensions`

## Impact

- **Spec**: `spec/specs/pages/spec.md` — extends Report Builder pivot dimensions capability
- **API**: `POST /api/v1/reports/custom` — response rows gain three new string fields (non-breaking addition)
- **Backend**: `backend/api/endpoints/reports.py` — one additional eager-load join + three new dict keys per row
- **Frontend**: pivot config panel, data table
- **Users**: All roles gain access to the three new pivot dimensions in the Report Builder
