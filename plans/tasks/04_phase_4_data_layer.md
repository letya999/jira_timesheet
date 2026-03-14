# Task 04: Phase 4 — Data Layer

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
