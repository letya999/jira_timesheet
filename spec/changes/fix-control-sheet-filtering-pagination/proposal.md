# Proposal: fix-control-sheet-filtering-pagination

## Why
1. **Team Filtering Issue**: The `Team Summary` matrix on the `/app/control-sheet` page currently shows employees that do not match the selected Team filter. This is likely due to the backend not strictly filtering worklogs for PMs and the frontend aggregation logic not double-checking team membership for logs.
2. **Missing Pagination**: The `Employee Summary` section can grow very long with many employees, leading to poor performance and UX. It needs standard pagination using the existing `CardList` component.

## What Changes
### Backend
- **`backend/api/endpoints/reports.py`**:
    - Update `get_dashboard_data` to ensure `org_unit_id` is strictly enforced for PMs (check access).
    - Add `org_unit_id` to the returned worklog records in the dashboard data to allow precise frontend filtering if needed.
- **`backend/schemas/reports.py`**:
    - Update schema for dashboard data to include `org_unit_id`.

### Frontend
- **`web/src/routes/_app.control-sheet.tsx`**:
    - Implement client-side pagination for the `Employee Summary` section (state: `page`, `pageSize`).
    - Use `CardList` pagination props to render controls.
    - Refine `summaries` derivation to ensure that when a specific team is selected, only employees and logs belonging to that team are included.
    - Add `OrgUnit ID` to `DashboardRow` type definition.

## Impact
- **Security**: PMs can no longer access dashboard data for teams they don't manage by manually passing `org_unit_id`.
- **UX**: The `Team Summary` accurately reflects the selected team filter. The `Employee Summary` is easier to navigate through pagination.
- **Performance**: Pagination reduces the number of rendered `CollapsibleBlock` and `PivotTable` instances on the page at once.
