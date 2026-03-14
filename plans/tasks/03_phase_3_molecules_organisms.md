# Task 03: Phase 3 — Molecules & Organisms

**Goal:** All reusable complex components live in Storybook with real mock data via MSW.

### Rule: MSW is mandatory for every Organism story
Each organism story has a `mswDecorator` that serves fake data matching the generated API types.
Organisms must demonstrate: loading, error, empty, and populated states.

### Molecules

| Component | Description |
|---|---|
| `FormField` | Label + Input/Select/etc + error message |
| `SearchBar` | Input with debounce + clear |
| `UserRow` | Avatar + name + role + department + status |
| `DateRangePicker` | date-fns-tz aware, locale-sensitive |
| `PaginationBar` | page/size controls |
| `ConfirmDialog` | Radix AlertDialog wrapper |
| `EmptyState` | icon + title + description + optional CTA |
| `ErrorFallback` | React ErrorBoundary display component |
| `FilterBar` | composable filter chips |

### Organisms

| Component | Domain | Notes |
|---|---|---|
| `DataTable` | shared | TanStack Table v9, sort/filter/pagination, URL-synced state, virtual scroll via `@tanstack/react-virtual` |
| `EmployeeCard` | users | avatar, name, role, dept, hours for period, sync status |
| `WorklogEntryForm` | timesheet | RHF + Zod, DateTimePicker, Project selector, activity type |
| `TimesheetGrid` | timesheet | employee × day matrix, inline editable cells, optimistic updates |
| `ReportSummaryCard` | reports | CapEx/OpEx breakdown, percentage bar, period label |
| `OrgTreeNode` | org | recursive node with expand/collapse, drag reorder |
| `ProjectRow` | projects | name, key, sync status, last synced timestamp |
| `ApprovalCard` | approvals | requester info, date range, hours, approve/reject actions |
| `NotificationItem` | notifications | type icon, message, timestamp, read/unread state |
| `LeaveRequestCard` | leave | employee, type, dates, status badge, actions |
| `SyncStatusWidget` | sync | last sync time, status, manual trigger button, progress |
| `GanttWrapper` | projects | dhtmlx-gantt wrapped in useEffect + ref (non-React lib isolation) |

### Gantt Strategy
`dhtmlx-gantt` is not a React component. Integration:
1. Create `GanttWrapper` organism with a `containerRef`
2. `useEffect` initializes gantt on mount, destroys on unmount
3. Props flow in via gantt config API — no direct DOM manipulation outside the wrapper
4. Storybook story uses static task data (no MSW needed)

### Completion Criteria
- [ ] All organisms in Storybook with all 4 states (loading/error/empty/populated)
- [ ] MSW handlers serve typed data matching generated schemas
- [ ] DataTable URL-state works (sort/filter reflected in URL params)
- [ ] GanttWrapper renders without errors
