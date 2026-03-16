# Implementation Tasks: implement-journal-streamlit-parity

1. Update `useTimesheetEntries` query param typing to include `project_id`, `category`, `org_unit_id`, `sort_order`, `page`, `size` while keeping existing fields backward-compatible.
2. Rebuild `/app/journal` route to render a collapsible "Фильтры и Поиск" panel using shadcn controls:
- Start date, end date
- Team select
- Project select
- Category select
- Date sort radio (`asc`/`desc`)
- Page-size slider
3. Connect controls to `useTimesheetEntries` with server pagination and reset page to 1 on filter changes.
4. Replace data table with Streamlit-like worklog cards showing:
- User + logged hours
- Issue key/summary headline
- Project and category row
- Logged timestamp and work date
5. Show result counter line in format "Показано X из Y записей".
6. Validate with `npm run lint` in `web` and fix all introduced issues.
