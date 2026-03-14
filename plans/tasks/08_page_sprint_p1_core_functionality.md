# Task 08: Page Sprint P1 — Core Functionality

**Goal:** Assemble Dashboard, My Timesheet, and Journal pages. Deprecate Streamlit for these immediately.

### Priority Order: P1 — Core Functionality

| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| Dashboard | `/app/dashboard` | `ReportSummaryCard` ×4, `SyncStatusWidget`, `DataTable` | Overview KPIs |
| My Timesheet | `/app/my-timesheet` | `TimesheetGrid`, `WorklogEntryForm` (modal) | Optimistic updates critical |
| Journal | `/app/journal` | `DataTable` (full worklog list), inline edit | Highest daily usage |

### Process per page (OpenSpec SDD cycle):
1. `openspec-proposal`: what data, which organisms, which hooks, which roles
2. Review: confirm all dependencies exist in phases 0-6
3. `openspec-implementation`: assemble
4. Playwright E2E test written for happy path
5. Streamlit equivalent page marked for deprecation

### Completion Criteria
- [ ] Dashboard assembled
- [ ] My Timesheet assembled with optimistic updates
- [ ] Journal assembled with inline edit
- [ ] E2E tests pass for all 3 pages
