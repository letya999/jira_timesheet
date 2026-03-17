# Implementation Tasks

1. Add `joinedload(Worklog.issue).joinedload(Issue.issue_type_obj)` to the eager-load options in `get_custom_report` in `backend/api/endpoints/reports.py`
2. Add `issue_link`, `issue_name`, `issue_type` fields to the per-worklog dict in `get_custom_report`
3. Add `issue_link`, `issue_name`, `issue_type` entries to `PIVOT_DIMENSIONS` in `pivot-config-panel.tsx`
4. Add translation keys for `issue_link`, `issue_name`, `issue_type` to `web.reports.dimensions` in `en.json` and `ru.json`
5. Modify row-cell rendering in `report-data-table.tsx` to detect the `issue_link` dimension and render as a clickable `<a>` tag showing just the issue key
6. Verify pivot grouping works correctly for all three new dimensions in manual testing
