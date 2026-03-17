# Proposal: Refactor Frontend to Reusable Components

## Why
The frontend currently uses several UI patterns (lists, tables, pivot tables) that are implemented multiple times with slight variations. This leads to code duplication, inconsistent UI/UX (e.g., varying pagination behavior), and higher maintenance effort. Specifically:
- Card lists are mapped manually in multiple pages (`JournalPage`, `DashboardPage`, `ProjectsPage`, etc.).
- Pivot tables have two distinct implementations: `TimesheetGrid` (editable, fixed 7-day) and `ReportDataTable` (read-only, generic dimensions).
- Action tables are implemented using `DataTable` but require manual integration with `ListPagination`.

## What Changes
1. **`CardList<T>`**: Create a generic component that handles loading states, empty messages, and integrates pagination.
2. **`ActionTable<T>`**: Create a generic component that extends `DataTable` with built-in pagination and standardized action handling.
3. **`PivotTable`**: Consolidate `TimesheetGrid` and `ReportDataTable` into a unified component (or a shared base) that supports both editable and read-only modes, as well as varying dimensions.
4. Refactor existing pages to use these new components:
    - `/app/journal`, `/app/dashboard`, `/app/projects`, `/app/approvals`, `/app/leave`, `/app/notifications` -> `CardList`.
    - `/app/employees` -> `ActionTable`.
    - `/app/my-timesheet`, `/app/control-sheet`, `/app/reports` -> `PivotTable`.

## Impact
- **Maintenance**: Reduced code duplication and centralized logic for lists/tables.
- **Consistency**: Unified pagination and loading behavior across the app.
- **Performance**: Standardized virtualization for large lists/tables.
- **Developer Experience**: Easier to create new pages using established UI patterns.
