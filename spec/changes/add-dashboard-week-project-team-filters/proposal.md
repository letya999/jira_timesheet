# Proposal: add-dashboard-week-project-team-filters

## Why

Dashboard currently always shows data for the current week/month and has no interactive filters for team or project. Users need to inspect a concrete week and narrow results by project and team without leaving the page.

## What Changes

- Add a collapsible filter section on `/app/dashboard`.
- Add filter controls:
  - week selector (week anchored by selected date, normalized to Monday-Sunday),
  - project selector,
  - team selector.
- Make dashboard widgets and table show data for the selected week (and month-to-date of that selected week) with project/team filters applied.
- Keep existing sync widget behavior.

## Impact

- Affected area: `web/src/features/dashboard/pages/dashboard-page.tsx`
- Related hooks used:
  - `useTimesheetEntries` for filtered data,
  - `useReportProjects` and `useReportOrgUnits` for filter options.
- No backend API change required (uses existing query params `start_date`, `end_date`, `project_id`, `org_unit_id`).