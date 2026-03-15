# Proposal: implement-phase8-sprint-p1-pages

## Why

Phases 0-6 delivered the full foundation — data layer, routing, auth, organisms, hooks, and MSW mocks. The three highest-traffic pages (Dashboard, My Timesheet, Journal) are still placeholder stubs. Users hitting `/app/dashboard`, `/app/my-timesheet`, or `/app/journal` see a grey card with "placeholder — Phase 6". This change replaces those stubs with fully assembled pages wired to real hooks and organisms, deprecating the Streamlit equivalents for these routes immediately.

## What Changes

### Dashboard Page (`/app/dashboard`)
- Replace placeholder component with a grid layout containing:
  - `ReportSummaryCard` ×4: "This Week" (current Mon–Sun), "This Month" (current calendar month), "CapEx Total" (month-to-date), "OpEx Total" (month-to-date)
  - `SyncStatusWidget` wired to `useTriggerSync` and `useSyncStatus` — polls job status while syncing
  - `DataTableOrganism` showing the 10 most recent worklogs for the current user (columns: date, project, issue, hours, type, status)
- Data sourced from `useMyTimesheetEntries` (week + month ranges) and `useCapexReport` / `useOpexReport`
- Loader prefetches `timesheetKeys.myEntries()` (already in stub); extends to also prefetch reports dashboard data

### My Timesheet Page (`/app/my-timesheet`)
- Replace placeholder with week-view timesheet:
  - Week navigation header: "< Prev" / "Next >" buttons + current week label (e.g. "Week of Mar 10 – 16, 2026")
  - `TimesheetGrid` component wired to `useMyTimesheetEntries` for the displayed week; `onUpdate` triggers `useUpdateEntry` with optimistic state already built into `TimesheetGrid`
  - "Log Time" button (top-right) opens a `Dialog` containing `WorklogEntryForm`; on successful submit calls `useCreateEntry` (optimistic update in hook) and closes dialog
- Skeleton loaders shown while `isLoading`

### Journal Page (`/app/journal`)
- Replace placeholder with full worklog list:
  - `FilterBar` with a `DateRangePicker` for start/end date (defaults: first day of current month to today)
  - `DataTableOrganism` with columns: date, project_name, issue_key / issue_summary, hours, type, status, category_name
  - Pagination wired through `useTimesheetEntries(params)` — start_date, end_date, skip, limit derived from table state
  - Status rendered as `StatusBadge` component; inline display only (no edit — PATCH endpoint not yet available)

## Impact

**Specs affected**: New capability `spec/specs/pages/` (does not yet exist — creating)

**Files modified** (no new files, only route replacements):
- `web/src/routes/_app.dashboard.tsx` — replace placeholder component
- `web/src/routes/_app.my-timesheet.tsx` — replace placeholder component
- `web/src/routes/_app.journal.tsx` — replace placeholder component

**Files created**:
- `tests/e2e/dashboard.spec.ts` — Playwright happy-path E2E
- `tests/e2e/my-timesheet.spec.ts` — Playwright happy-path E2E
- `tests/e2e/journal.spec.ts` — Playwright happy-path E2E

**APIs consumed** (all previously verified in phases 4-6):
- `GET /api/v1/timesheet/worklogs` (my entries, date-filtered)
- `GET /api/v1/timesheet` (all entries, paginated)
- `POST /api/v1/timesheet/manual` (create entry)
- `GET /api/v1/reports/dashboard` (capex/opex aggregates)
- `POST /api/v1/sync/worklogs` (trigger sync)
- `GET /api/v1/sync/jobs/{job_id}` (poll sync status)

**Users impacted**: All authenticated users — these are the highest daily-usage routes.

**Dependencies confirmed (phases 0-6)**:
- `ReportSummaryCard` — `web/src/components/shared/report-summary-card.tsx` ✓
- `SyncStatusWidget` — `web/src/components/shared/sync-status-widget.tsx` ✓
- `DataTableOrganism` — `web/src/components/shared/data-table-organism.tsx` ✓
- `TimesheetGrid` + `TimesheetEntry` — `web/src/components/time/timesheet-grid.tsx` ✓
- `WorklogEntryForm` — `web/src/components/time/worklog-entry-form.tsx` ✓
- `Dialog` — `web/src/components/ui/dialog.tsx` ✓
- `FilterBar` — `web/src/components/shared/filter-bar.tsx` ✓
- `StatusBadge` — `web/src/components/ui/status-badge.tsx` ✓
- `Skeleton` — `web/src/components/ui/skeleton.tsx` ✓
- `useTimesheetEntries`, `useMyTimesheetEntries`, `useCreateEntry` — `web/src/features/timesheet/hooks/index.ts` ✓
- `useCapexReport`, `useOpexReport` — `web/src/features/reports/hooks/index.ts` ✓
- `useTriggerSync`, `useSyncStatus` — `web/src/features/sync/hooks/index.ts` ✓
- `WorklogResponse` type — `web/src/api/generated/types.gen.ts` ✓
- MSW handlers for timesheet, sync, reports — `web/src/mocks/handlers/` ✓

**Streamlit deprecation**: The three Streamlit pages corresponding to these routes are marked for deprecation once this change is implemented. No Streamlit code is modified in this change — the migration is signalled by the React pages becoming the primary interface.
