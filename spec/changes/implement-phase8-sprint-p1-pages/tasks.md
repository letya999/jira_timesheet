# Implementation Tasks: implement-phase8-sprint-p1-pages

## Phase 8 — Sprint P1 Core Pages (Dashboard, My Timesheet, Journal)

### Dashboard

1. Replace `web/src/routes/_app.dashboard.tsx` component — import `ReportSummaryCard`, `SyncStatusWidget`, `DataTableOrganism`; define `DashboardPage` component that:
   - Derives `weekStart`/`weekEnd` (startOfWeek/endOfWeek of today, weekStartsOn: 1) and `monthStart`/`monthEnd` (startOfMonth/endOfMonth of today) using `date-fns`
   - Calls `useMyTimesheetEntries({ start_date: weekStart, end_date: weekEnd })` and a second instance for the month range
   - Calls `useCapexReport({ start_date: monthStart, end_date: monthEnd })` and `useOpexReport` with same range
   - Calls `useTriggerSync()` and `useSyncStatus(jobId)` to wire `SyncStatusWidget`
   - Renders 4 `ReportSummaryCard` instances in a `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4` layout
   - Renders `SyncStatusWidget` below the cards
   - Renders `DataTableOrganism` with `recentColumns` (date, project_name, issue_key, hours, type, status) showing last 10 worklogs

2. Define `recentColumns: ColumnDef<WorklogResponse>[]` inside the dashboard route file — columns for date (formatted), project_name, issue_key (with `JiraKeyLink` if available), hours, type, status (with `StatusBadge`)

3. Wire loader in `_app.dashboard.tsx` — extend existing `prefetchQuery` to also prefetch reports dashboard data for current month range using `reportsKeys.dashboard()`

### My Timesheet

4. Replace `web/src/routes/_app.my-timesheet.tsx` component — import `TimesheetGrid`, `WorklogEntryForm`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`, `Button`, `Skeleton`; define `MyTimesheetPage` that:
   - Holds `weekOffset` state (`useState(0)`) for prev/next navigation
   - Derives `weekStart` = `addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset)` and `weekEnd` = `addDays(weekStart, 6)`
   - Calls `useMyTimesheetEntries({ start_date: format(weekStart, 'yyyy-MM-dd'), end_date: format(weekEnd, 'yyyy-MM-dd') })`
   - Calls `useCreateEntry()` for the WorklogEntryForm submit handler
   - Holds `isModalOpen` state for the "Log Time" dialog
   - Renders week navigation bar with `<` / `>` buttons and week label
   - Renders `TimesheetGrid` with entries mapped from `WorklogResponse[]` to `TimesheetEntry[]` (id, taskName from issue_summary, projectKey from project_name, values keyed by date string)
   - Renders `<Dialog>` containing `<WorklogEntryForm>` wired to `useCreateEntry.mutateAsync`

5. Implement `mapWorklogsToTimesheetEntries(worklogs: WorklogResponse[]): TimesheetEntry[]` — inline helper in `_app.my-timesheet.tsx` that groups worklogs by `issue_key` (or `id` as fallback), building the `values` map from `date → hours`

6. Show `Skeleton` rows (3 rows, same grid structure) while `isLoading` is true for `useMyTimesheetEntries`

### Journal

7. Replace `web/src/routes/_app.journal.tsx` component — import `DataTableOrganism`, `FilterBar`, `DateRangePicker` (or `DateRangePickerTz`), `StatusBadge`, `JiraKeyLink`; define `JournalPage` that:
   - Holds `dateRange` state with defaults `{ from: startOfMonth(today), to: today }`
   - Holds `page` state (`useState(1)`) and `pageSize` state (`useState(20)`)
   - Calls `useTimesheetEntries({ start_date, end_date, skip: (page-1)*pageSize, limit: pageSize })` with dates formatted as `yyyy-MM-dd`
   - Renders `FilterBar` with `DateRangePicker` for date range selection, resetting page to 1 on change
   - Renders `DataTableOrganism` with `journalColumns` and paginated data

8. Define `journalColumns: ColumnDef<WorklogResponse>[]` inside the journal route file — columns:
   - `date` — formatted `dd MMM yyyy`
   - `project_name` — plain text, fallback "—"
   - `issue_key` — rendered as `<JiraKeyLink>` when truthy, else issue_summary or "—"
   - `hours` — right-aligned numeric
   - `type` — plain text badge or text
   - `status` — `<StatusBadge>` component
   - `category_name` — plain text, fallback "—"

### E2E Tests

9. Create `tests/e2e/dashboard.spec.ts` — Playwright E2E happy path:
   - Navigate to `/app/dashboard` (MSW intercepts API calls)
   - Assert page title "Dashboard" is visible
   - Assert 4 `ReportSummaryCard` elements are visible (by test ID or heading text)
   - Assert `SyncStatusWidget` "Sync Now" button is present
   - Assert data table renders at least one row (or empty state)

10. Create `tests/e2e/my-timesheet.spec.ts` — Playwright E2E happy path:
    - Navigate to `/app/my-timesheet`
    - Assert week navigation header is visible with current week range
    - Assert `TimesheetGrid` column headers (Mon–Sun) are visible
    - Click "Log Time" button
    - Assert dialog opens with "Log Work" submit button visible
    - Close dialog, assert it closes

11. Create `tests/e2e/journal.spec.ts` — Playwright E2E happy path:
    - Navigate to `/app/journal`
    - Assert page title "Journal" is visible
    - Assert date range filter is present
    - Assert data table renders with correct column headers (Date, Project, Issue, Hours, Type, Status)
    - Assert pagination bar is visible

### Validation

12. Run `bun run typecheck` — verify zero TypeScript errors across all 3 modified route files and the 3 new E2E test files

13. Run `bun run lint` — verify no ESLint violations; fix any import order or unused-import warnings

14. Run `bun run test` — verify existing unit tests still pass (timesheet hook tests, auth store tests, permissions tests)
