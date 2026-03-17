# Implementation Tasks: fix-control-sheet-filtering-pagination

1. [x] **Update Backend Dashboard Data Schema**: The endpoint returns `dict[str, Any]`, response structure was updated in the endpoint.
2. [x] **Enhance `get_dashboard_data` Endpoint**:
    - Update `backend/api/endpoints/reports.py` to include `org_unit_id` in the returned worklog records.
    - Implement PM access check: verify that the requested `org_unit_id` is within the teams managed by the PM.
3. [x] **Update Frontend Types**: Add `org_unit_id` to `DashboardRow` in `web/src/routes/_app.control-sheet.tsx`.
4. [x] **Implement Client-Side Pagination**:
    - Add `page` and `pageSize` state to `ControlSheet` component.
    - Slice `summaries` for `Employee Summary` section based on pagination state.
    - Configure `CardList` to show pagination and handle `onPageChange`.
5. [x] **Fix Frontend Summary Filtering**:
    - Update `summaries` derivation in `ControlSheet` to strictly filter by `org_unit_id` when `selectedTeam !== 'all'`.
    - Handle cases where `DashboardRow` might have a different `org_unit_id` than the selected team (if any).
6. [x] **Verify and Test**:
    - Manually verify that changing the Team filter correctly updates both `Team Summary` and `Employee Summary`.
    - Check that the `Employee Summary` pagination works as expected.
    - Ensure PMs cannot access data for unauthorized teams by testing with a PM user.
