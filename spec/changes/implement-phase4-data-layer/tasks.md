# Implementation Tasks — Phase 4 Data Layer

## Infrastructure

1. Install `@tanstack/react-query-devtools` dev dependency
2. Create `src/lib/toast.ts` — placeholder toast with `error`, `success`, `warning`
3. Create `src/lib/query-client.ts` — `createQueryClient()` with staleTime 60s, gcTime 5min, retry with exponential backoff skipping 401/403/404, global QueryCache/MutationCache error handlers
4. Create `src/lib/search-params.ts` — Zod schemas for shared URL params: `paginationSchema`, `dateRangeSchema`, `sortSchema`, `timesheetFilterSchema`, `approvalFilterSchema`
5. Update `src/main.tsx` — replace `new QueryClient()` with `createQueryClient()`, add `<ReactQueryDevtools>` in dev mode only

## State Management

6. Create `src/stores/auth-store.ts` — `useAuthStore` with `{ user, token, permissions, isAuthenticated }` persisted to localStorage via `zustand/middleware`
7. Create `src/stores/ui-store.ts` — `useUIStore` with `{ sidebarOpen, locale, activeFilters, selectedPeriod }` session-only (no persist)

## Auth Hooks

8. Create `src/features/auth/hooks/index.ts`:
   - `useCurrentUser` — query for `/api/v1/users/me`, enabled only when authenticated
   - `useLogin` — mutation calling `loginApiV1AuthLoginPost`, sets token + fetches user profile on success
   - `useLogout` — mutation clearing token, auth store, and full QueryClient cache
   - `useRefreshToken` — stub mutation (placeholder until backend exposes refresh endpoint)

## Domain Hooks

9. Create `src/features/users/hooks/index.ts`:
   - `useUsers(params?)` — paginated user list
   - `useUser(id)` — single user by ID
   - `useUpdateUser()` — mutation with cache invalidation
   - `useUserWorkload(userId)` — workload from employees endpoint

10. Create `src/features/org/hooks/index.ts`:
    - `useOrgTree()` — full org unit tree
    - `useDepartments(params?)` — filtered org units
    - `useDepartment(id)` — single org unit

11. Create `src/features/projects/hooks/index.ts`:
    - `useProjects(params?)` — project list with filters
    - `useProject(id)` — single project details
    - `useSyncProjects()` — mutation to trigger full project sync
    - `useProjectSyncStatus(jobId)` — poll sync job status

12. Create `src/features/timesheet/hooks/index.ts` (optimistic on mutations):
    - `useTimesheetEntries(params?)` — worklogs for current user or all
    - `useCreateEntry()` — optimistic: add placeholder entry to cache, rollback on error
    - `useUpdateEntry()` — optimistic: update cache immediately, rollback on error
    - `useDeleteEntry()` — optimistic: remove from cache immediately, rollback on error

13. Create `src/features/reports/hooks/index.ts`:
    - `useCapexReport(params)` — CapEx dashboard data
    - `useOpexReport(params)` — OpEx dashboard data
    - `useExportReport(params)` — export mutation returning blob/URL

14. Create `src/features/approvals/hooks/index.ts`:
    - `useApprovals(params?)` — team period list
    - `useApproveEntry()` — mutation with cache invalidation
    - `useRejectEntry()` — mutation with cache invalidation
    - `useBulkApprove()` — sequential approve mutations via Promise.all

15. Create `src/features/leave/hooks/index.ts`:
    - `useLeaveRequests(params?)` — own or all leave requests
    - `useCreateLeaveRequest()` — mutation with invalidation
    - `useUpdateLeaveStatus()` — mutation (approve/reject) with invalidation

16. Create `src/features/notifications/hooks/index.ts`:
    - `useNotifications()` — query with `refetchInterval: 30_000`
    - `useMarkAsRead()` — optimistic: mark notification read in cache, rollback on error
    - `useMarkAllRead()` — mutation with full notifications cache invalidation

17. Create `src/features/calendar/hooks/index.ts`:
    - `useCalendar(params?)` — calendar events
    - `useHolidays(params?)` — holidays list (longer staleTime: 24h)

18. Create `src/features/sync/hooks/index.ts`:
    - `useSyncStatus(jobId?)` — poll job status when jobId present
    - `useTriggerSync()` — mutation, returns jobId for status polling

## Validation

19. Verify TypeScript compiles without errors: `bun run build` (type check only)
20. Verify no lint errors: `bun run lint`
