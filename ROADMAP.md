# Global Roadmap: Streamlit → React Migration

> Last updated: 2026-03-14
> Stack: Bun 1.3.x · Vite 8 · TypeScript 6 · React 19 · TanStack Router v1 · TanStack Query v5 · Zustand 5 · Tailwind 4 · Storybook 10 · MSW 2 · Vitest 3 · Playwright

---

## Migration Strategy

The Streamlit frontend and React frontend run **in parallel** during the migration. Caddy already has side-by-side routing configured. React is served from `/web` build output. Streamlit is deprecated page by page — only after the React equivalent is verified in production.

Deprecation order follows the Page Sprint priority list below.

---

## Phase 0 — Foundation

**Goal:** `bun dev` + `bun storybook` + `bun test` all work. CI passes.

### Tooling
- `web/` directory at project root (alongside `backend/`)
- Bun 1.3.x as package manager and runtime
- Vite 8 (Rolldown-based) as build tool
- TypeScript 6 in strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- ESLint 10 + Prettier + Husky pre-commit hook
- `.env.development` / `.env.production` for API base URL config

### Testing Infrastructure
- Vitest 3 (unit + component logic)
- Storybook 10 with `@storybook/experimental-addon-test` (Vitest integration)
- `@storybook/addon-a11y` (accessibility checks in every story)
- Playwright (E2E skeleton — real tests written per page in Page Sprint)
- MSW 2 global setup in `src/mocks/` — handlers per domain

### Styling
- Tailwind 4 via `@import "tailwindcss"` (no tailwind.config.js)
- shadcn/ui CLI initialized with custom tokens
- `src/styles/tokens.css` with CSS custom properties

### Project Structure
```
web/
  src/
    api/           # generated types + client
    assets/
    components/    # atoms and molecules (shared, domain-agnostic)
    features/      # domain-grouped: auth, timesheet, reports, org, ...
      {domain}/
        components/  # organisms specific to this domain
        hooks/
        schemas/
        stories/
    layouts/       # AppLayout, AuthLayout
    lib/           # utils, date helpers, formatters
    mocks/         # MSW handlers
    routes/        # TanStack Router file-based routes
    stores/        # Zustand stores
    styles/
    test/          # test utilities, render helpers
```

### i18n Setup (do in Phase 0, not later)
- `react-i18next` + `i18next`
- `src/i18n/` with `en.json` / `ru.json` (mirror existing `frontend/i18n.py` keys)
- `useTranslation()` hook used from the first component
- Language switcher component built in Phase 2

### Completion Criteria
- [ ] `bun dev` opens Hello World on localhost
- [ ] `bun storybook` starts without errors
- [ ] `bun test` runs and passes
- [ ] `bun run lint` passes
- [ ] CI pipeline runs on push (GitHub Actions or equivalent)

---

## Phase 1 — API Contract (SDD Foundation)

**Goal:** Entire backend is accessible as typed functions. No manual interface definitions for API models.

### Steps
- Start FastAPI backend, export `/openapi.json`
- Configure `@hey-api/openapi-ts` → `openapi-ts.config.ts`
- Script: `bun run api:generate` outputs to `src/api/generated/`
- Configure `@hey-api/client-fetch`: base URL from env, Bearer token interceptor, 401/403/500 global error handler
- Pin `@hey-api/openapi-ts` to exact version (currently pre-1.0, API is unstable)

### Backend Domains Covered
```
auth       → /auth/login, /auth/logout, /auth/refresh, /auth/sso
users      → /users, /users/{id}
org        → /org/tree, /org/departments
projects   → /projects, /projects/{id}, /projects/sync
timesheet  → /timesheet, /timesheet/{id}
reports    → /reports/capex, /reports/opex, /reports/export
approvals  → /approvals, /approvals/{id}/approve, /approvals/{id}/reject
leave      → /leave, /leave/{id}
notifications → /notifications, /notifications/read
calendar   → /calendar
sync       → /sync/status, /sync/trigger
```

### Zod Layer
- Zod schemas in `src/features/{domain}/schemas/` wrapping generated types
- Runtime validation at API boundaries (even with generated types)
- Form schemas derived from the same Zod definitions (single source of truth)

### Completion Criteria
- [x] `bun run api:generate` runs without errors
- [x] All endpoints produce typed response shapes
- [x] Client interceptors handle auth errors globally

---

## Phase 2 — Design System (Tokens + Atoms)

**Goal:** Complete atom library in Storybook. Every atom has Controls panel with all visual states.

### 2a — Tokens
- CSS custom properties in `src/styles/tokens.css`
- Color palette: primary, neutral, success, warning, error, info (light + dark variants)
- Typography scale: font-family, size scale, line-height, font-weight
- Spacing, border-radius, shadow, z-index scales
- Dark mode via `[data-theme="dark"]` on `<html>` (Tailwind 4 native)

### 2b — Atoms (each = component + story + unit test)

| Component | CVA Variants |
|---|---|
| `Button` | variant (primary/secondary/ghost/destructive), size (sm/md/lg), loading, disabled |
| `Input` | size, state (default/error/success), leading icon, trailing icon |
| `Textarea` | size, state |
| `Select` | size, state, clearable |
| `MultiSelect` | size, state, search |
| `Checkbox` | checked, indeterminate, disabled |
| `Switch` | checked, disabled |
| `Radio` / `RadioGroup` | disabled |
| `Badge` | variant (default/secondary/outline) |
| `StatusBadge` | status (active/syncing/error/warning/archived/pending) — used for Jira sync states |
| `Avatar` | size (sm/md/lg), fallback (initials from name), online indicator |
| `Skeleton` | shape (line/circle/rect), animated |
| `Spinner` | size, color |
| `Tooltip` | placement, delay |
| `Alert` | variant (info/success/warning/error), dismissible |
| `Separator` | orientation |
| `LanguageSwitcher` | compact/full |

### Rules
- Atoms have zero business logic and zero API knowledge
- `StatusBadge` accepts `status: "active" | "synced" | "error"` — not raw Jira strings
- All atoms pass a11y checks in Storybook

### Completion Criteria
- [ ] All atoms rendered in Storybook
- [ ] All states visible via Controls panel
- [ ] `bun test` passes for all atom unit tests
- [ ] No a11y violations in Storybook

---

## Phase 3 — Molecules & Organisms

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

---

## Phase 4 — Data Layer

**Goal:** All API hooks work against real backend. QueryClient configured for production use.

### QueryClient Setup
- `staleTime`: 60s for most queries, 0 for real-time like notifications
- `gcTime`: 5 minutes
- Retry: 3 attempts with exponential backoff, skip retry on 401/403/404
- `ReactQueryDevtools` in development only
- Global `onError` → toast notification for network errors

### Hooks by Domain

| Domain | Hooks |
|---|---|
| auth | `useCurrentUser`, `useLogin`, `useLogout`, `useRefreshToken` |
| users | `useUsers`, `useUser`, `useUpdateUser`, `useUserWorkload` |
| org | `useOrgTree`, `useDepartments`, `useDepartment` |
| projects | `useProjects`, `useProject`, `useSyncProjects`, `useProjectSyncStatus` |
| timesheet | `useTimesheetEntries`, `useCreateEntry`, `useUpdateEntry`, `useDeleteEntry` |
| reports | `useCapexReport`, `useOpexReport`, `useExportReport` |
| approvals | `useApprovals`, `useApproveEntry`, `useRejectEntry`, `useBulkApprove` |
| leave | `useLeaveRequests`, `useCreateLeaveRequest`, `useUpdateLeaveStatus` |
| notifications | `useNotifications`, `useMarkAsRead`, `useMarkAllRead` |
| calendar | `useCalendar`, `useHolidays` |
| sync | `useSyncStatus`, `useTriggerSync` |

### Optimistic Updates
Apply to: `useCreateEntry`, `useUpdateEntry`, `useDeleteEntry`, `useMarkAsRead`
Pattern: update QueryClient cache immediately, rollback on error with toast.

### Zustand Stores
- `useAuthStore`: `{ user, token, permissions, isAuthenticated }` — persisted to localStorage
- `useUIStore`: `{ sidebarOpen, locale, activeFilters, selectedPeriod }` — session only

### URL State Strategy
Filters, pagination, sort, and date ranges live in URL search params — not in component state.
Use TanStack Router's `search` param validation with Zod.
This enables shareable links and browser back/forward navigation.

### Real-time Infrastructure
- Notifications: polling every 30s via `refetchInterval` (simple) OR WebSocket (if backend supports)
- AI Chat: SSE or WebSocket — isolated in `features/ai-chat/`
- Check backend `main.py` for WebSocket endpoint availability before deciding

### Completion Criteria
- [ ] All hooks tested against running backend
- [ ] Optimistic updates work with rollback on error
- [ ] URL state round-trips (refresh page preserves filters)
- [ ] Auth store persists across page reload

---

## Phase 5 — Routing & Layout

**Goal:** Navigation works, layouts assembled, route protection in place.

### Route Tree
```
/login                    → AuthLayout
/app                      → AppLayout (sidebar + topbar)
  /app/dashboard
  /app/journal
  /app/my-timesheet
  /app/org
  /app/employees
  /app/employees/$id
  /app/projects
  /app/projects/$id
  /app/reports
    /app/reports/capex
    /app/reports/opex
  /app/approvals
  /app/control-sheet
  /app/leave
  /app/notifications
  /app/settings
  /app/hr                 → Admin/HR only
  /app/ai-chat            → if AI module enabled
```

### Layouts
- `AuthLayout`: centered card, logo, no sidebar
- `AppLayout`: responsive sidebar (collapsible on mobile), topbar with user menu + lang switcher + notification bell
- Sidebar nav items filtered by user permissions

### Route Loaders
Each route loader prefetches its primary data using `queryClient.ensureQueryData()`.
Pending UI shown during loader execution (TanStack Router built-in).

### Completion Criteria
- [ ] All routes render without errors
- [ ] Sidebar navigation works
- [ ] Route loaders prefetch data
- [ ] 404 and error routes configured

---

## Phase 6 — Auth, RBAC, Sessions

**Goal:** Application is secured. Roles gate pages and components.

### Auth Flow
1. `/login` form → `POST /auth/login` → JWT access + refresh tokens
2. SSO button → `GET /auth/sso` → redirect flow (backend handles `auth_sso.py`)
3. Tokens stored: access token in memory (Zustand), refresh token in httpOnly cookie
4. `@hey-api/client-fetch` interceptor: attach Bearer, on 401 → call refresh → retry original request

### RBAC
- Roles extracted from JWT claims: `admin`, `manager`, `employee`, `hr`
- Permission map in `src/lib/permissions.ts`: role → Set of permission strings
- `usePermissions()` hook: `{ can: (permission: string) => boolean }`
- `<Guard permission="reports.view">` component for conditional rendering
- Route `beforeLoad` for page-level guard → `redirect('/login')` if unauthorized

### Session Management
- Inactivity timeout: 30 minutes, warn at 25 minutes
- Token expiry: silent refresh via interceptor
- Logout: clear Zustand store + call `POST /auth/logout` + redirect

### Completion Criteria
- [ ] Login → Dashboard flow works end-to-end
- [ ] SSO flow works
- [ ] Unauthorized users redirected to `/login`
- [ ] Roles correctly gate pages and UI elements
- [ ] Token refresh works transparently
- [ ] Inactivity logout works

---

## Gate: Before Page Sprint

All phases 0-6 must pass their completion criteria before pages are assembled.

Verification checklist:
- [ ] All atoms and organisms in Storybook — pages must not create new atomic components
- [ ] All API hooks tested against real backend
- [ ] Auth flow end-to-end verified
- [ ] URL state works for DataTable filters
- [ ] i18n keys loaded for both languages
- [ ] Bundle analyzed (`bun run build --analyze`), no unexpected large chunks
- [ ] Lighthouse score > 80 on Dashboard skeleton

---

## Page Sprint

Each page = composition of existing organisms + hooks. Minimal new code at page level.

**Process per page (OpenSpec SDD cycle):**
1. `openspec-proposal`: what data, which organisms, which hooks, which roles
2. Review: confirm all dependencies exist in phases 0-6
3. `openspec-implementation`: assemble
4. Playwright E2E test written for happy path
5. Streamlit equivalent page marked for deprecation

### Priority Order

#### P0 — Core Auth
| Page | Route | Key Components | Notes |
|---|---|---|---|
| Login | `/login` | `Button`, `Input`, `FormField` | SSO button, remember me |

#### P1 — Core Functionality (deprecate Streamlit immediately)
| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| Dashboard | `/app/dashboard` | `ReportSummaryCard` ×4, `SyncStatusWidget`, `DataTable` | Overview KPIs |
| My Timesheet | `/app/my-timesheet` | `TimesheetGrid`, `WorklogEntryForm` (modal) | Optimistic updates critical |
| Journal | `/app/journal` | `DataTable` (full worklog list), inline edit | Highest daily usage |

#### P2 — Reporting (key business value)
| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| CapEx Report | `/app/reports/capex` | `DataTable`, `ReportSummaryCard`, `FilterBar` | Export to CSV/Excel |
| OpEx Report | `/app/reports/opex` | Same as CapEx | Different classification logic |

#### P3 — Management
| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| Employees | `/app/employees` | `DataTable`, `EmployeeCard` (preview panel) | Filter by dept/role |
| Org Structure | `/app/org` | `OrgTreeNode` (recursive) | Expand/collapse hierarchy |
| Projects | `/app/projects` | `DataTable`, `ProjectRow`, `GanttWrapper` | Gantt on detail view |

#### P4 — Workflow
| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| Approvals | `/app/approvals` | `ApprovalCard` list, bulk actions | Manager role only |
| Control Sheet | `/app/control-sheet` | `TimesheetGrid` (aggregated, read-only) | Admin/Manager only |
| Leave Requests | `/app/leave` | `LeaveRequestCard` list, create form | All roles |

#### P5 — Supporting
| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| Notifications | `/app/notifications` | `NotificationItem` list | Real-time badge count |
| Settings | `/app/settings` | Tabs: profile, org, Jira integration, notifications | Admin tabs gated |
| HR Module | `/app/hr` | `DataTable`, management forms | HR/Admin only |

#### P6 — Advanced
| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| AI Chat | `/app/ai-chat` | Chat UI, SSE/WebSocket | Isolated module, deploy last |

---

## Cross-Cutting Concerns

### Performance
- All routes lazy-loaded (`React.lazy` + `Suspense`)
- `@tanstack/react-virtual` for any list > 100 items
- `DataTable` virtualized by default
- Images: WebP, lazy loading via `loading="lazy"`
- Bundle target: < 200kb initial JS (gzipped)

### Accessibility
- All atoms use Radix UI primitives (keyboard nav, ARIA built-in)
- `@storybook/addon-a11y` enforced in CI — story a11y violations block merge
- Focus management on modals and dialogs
- Color contrast meets WCAG 2.1 AA

### Timezone Handling
- All timestamps stored as UTC in backend
- `date-fns-tz` used everywhere for display — always convert to user's local timezone
- `useTimezone()` hook: reads from user profile settings, falls back to browser timezone
- Never use `new Date()` directly — always through lib wrapper

### Error Monitoring
- Sentry (or equivalent) initialized in `main.tsx`
- React ErrorBoundary at layout level
- Unhandled promise rejections captured
- User context attached to Sentry events (userId, role)

### CI/CD Integration
- On push to any branch: `bun run lint` + `bun run typecheck` + `bun test`
- On push to `dev`: Storybook build + Chromatic visual regression (or self-hosted)
- On push to `main`: full build + Playwright E2E + Docker image build
- Docker: `web/Dockerfile` with multi-stage build (bun build → nginx static)
- Caddy config updated to serve React build at primary route

---

## Streamlit Deprecation Tracker

| Streamlit View | React Equivalent | Status |
|---|---|---|
| `0_Home.py` | Dashboard | pending |
| `1_Journal.py` | Journal | pending |
| `2_Dashboard.py` | Dashboard | pending |
| `3_Report_Builder.py` | CapEx + OpEx Reports | pending |
| `4_Org_Structure.py` | Org Structure | pending |
| `5_Employees.py` | Employees | pending |
| `6_Projects.py` | Projects | pending |
| `7_Settings.py` | Settings | pending |
| `8_Approvals.py` | Approvals | pending |
| `8_Control_Sheet.py` | Control Sheet | pending |
| `9_Login.py` | Login | pending |
| `10_My_Timesheet.py` | My Timesheet | pending |
| `11_Notifications.py` | Notifications | pending |
| `12_Leave_Requests.py` | Leave Requests | pending |
| `13_HR_Module.py` | HR Module | pending |
| `14_AI_Chat.py` | AI Chat | pending |

Migration complete when all rows show `done` and `frontend/` directory is removed.

---

*This document is the single source of truth for the React migration. Update status fields as phases complete.*
