# Proposal: Implement Phase 4 — Data Layer

**Change ID**: `implement-phase4-data-layer`
**Branch**: `feature/04-phase4-data-layer`
**Date**: 2026-03-15

---

## Why

Phases 0–3 delivered: foundation, generated API types, design system, and all reusable components. The application has no server state yet — every component uses static mock data via MSW. Phase 4 bridges the gap: wiring all business domains to the real FastAPI backend via typed React Query hooks, establishing persistent auth state, and configuring the QueryClient for production resilience.

Without this layer, no page can be assembled (Phase 5+) because pages depend on domain hooks for data.

---

## What Changes

### New files

| File | Purpose |
|---|---|
| `src/lib/query-client.ts` | QueryClient factory: staleTime, gcTime, retry logic, global error toasts |
| `src/lib/toast.ts` | Placeholder toast utility (wired to real provider in Phase 5) |
| `src/lib/search-params.ts` | Zod schemas for URL search params (filters, pagination, dates) |
| `src/stores/auth-store.ts` | Zustand auth store persisted to localStorage |
| `src/stores/ui-store.ts` | Zustand UI store (session-only: sidebar, locale, filters) |
| `src/features/auth/hooks/index.ts` | `useCurrentUser`, `useLogin`, `useLogout`, `useRefreshToken` |
| `src/features/users/hooks/index.ts` | `useUsers`, `useUser`, `useUpdateUser`, `useUserWorkload` |
| `src/features/org/hooks/index.ts` | `useOrgTree`, `useDepartments`, `useDepartment` |
| `src/features/projects/hooks/index.ts` | `useProjects`, `useProject`, `useSyncProjects`, `useProjectSyncStatus` |
| `src/features/timesheet/hooks/index.ts` | `useTimesheetEntries`, `useCreateEntry`*, `useUpdateEntry`*, `useDeleteEntry`* |
| `src/features/reports/hooks/index.ts` | `useCapexReport`, `useOpexReport`, `useExportReport` |
| `src/features/approvals/hooks/index.ts` | `useApprovals`, `useApproveEntry`, `useRejectEntry`, `useBulkApprove` |
| `src/features/leave/hooks/index.ts` | `useLeaveRequests`, `useCreateLeaveRequest`, `useUpdateLeaveStatus` |
| `src/features/notifications/hooks/index.ts` | `useNotifications` (30s poll), `useMarkAsRead`*, `useMarkAllRead` |
| `src/features/calendar/hooks/index.ts` | `useCalendar`, `useHolidays` |
| `src/features/sync/hooks/index.ts` | `useSyncStatus`, `useTriggerSync` |

*Hooks with optimistic updates

### Modified files

| File | Change |
|---|---|
| `src/main.tsx` | Use `createQueryClient()`, add `ReactQueryDevtools` in dev mode |
| `web/package.json` | Add `@tanstack/react-query-devtools` dev dependency |

---

## Impact

- **Specs affected**: New — `spec/specs/data-layer/spec.md`
- **API contract**: All hooks call `sdk.gen.ts` functions; zero manual fetch calls
- **State management**: Auth token and user profile persist across page reload; UI state is session-only
- **URL state**: Filter/pagination/date search params defined as Zod schemas, ready for TanStack Router integration in Phase 5
- **Performance**: 60s staleTime reduces redundant requests; 5-min gcTime keeps cache alive during navigation
- **Resilience**: Exponential backoff retry (3 attempts), skip on 401/403/404, global error toasts for 5xx
- **Developer experience**: `ReactQueryDevtools` visible in dev builds only
