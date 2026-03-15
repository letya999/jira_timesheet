# Implementation Tasks: implement-phase6-auth-rbac

## Phase 6 — Auth, RBAC, Sessions

1. Create `web/src/lib/permissions.ts` — define `ROLE_PERMISSIONS: Record<string, Set<string>>` map for roles `admin`, `manager`, `employee`, `hr` with their permission strings

2. Create `web/src/features/auth/hooks/use-login.ts` — `useLogin` mutation using `useMutation` + `loginApiV1AuthLoginPost`, on success call `useAuthStore.setAuth()` and navigate to `/app/dashboard`, on error expose error message

3. Create `web/src/features/auth/hooks/use-logout.ts` — `useLogout` mutation that calls `POST /api/v1/auth/logout` (best-effort, ignore errors), then `clearAuth()`, `queryClient.clear()`, navigate to `/login`

4. Create `web/src/features/auth/hooks/use-permissions.ts` — `usePermissions()` returning `{ can: (permission: string) => boolean }` derived from `useAuthStore().permissions`

5. Create `web/src/features/auth/hooks/use-inactivity-timer.ts` — hook that listens to `mousemove`, `keydown`, `touchstart` events, warns at `warnMs` ms and calls `onTimeout` at `timeoutMs` ms of inactivity; cleans up on unmount

6. Create `web/src/features/auth/hooks/index.ts` — re-export all hooks from this directory

7. Update `web/src/api/client.ts` — replace the simple 401 redirect with a refresh-then-retry flow: call `POST /api/v1/auth/refresh`, if successful retry original request with new token; if refresh fails, call `clearAuth()` and redirect; guard against refresh loop

8. Create `web/src/components/shared/guard.tsx` — `<Guard permission="...">` component that renders `children` when `can(permission)` is true, otherwise returns `null`; also export `<PermissionGuard>` HOC variant

9. Replace `web/src/routes/_auth.login.tsx` — implement full `LoginPage` with `LoginForm` organism: React Hook Form + Zod schema (`{ username, password, rememberMe }`), Input/Label/Button/Checkbox/Card from shadcn/ui, SSO button calling `useSsoLogin`, error alert on mutation failure, loading spinner on submit

10. Update `web/src/routes/_app.tsx` — import and wire `useInactivityTimer` inside the `AppLayout` component (or a wrapper), using 30-minute timeout and 25-minute warn; show an inactivity warning dialog/toast at warn threshold

11. Extend permission guards on restricted routes — add `beforeLoad` permission checks to `_app.hr.tsx` (`hr:read`), `_app.reports.capex.tsx` (`reports.view`), `_app.reports.opex.tsx` (`reports.view`) with redirect to `/app/dashboard`

12. Write `tests/e2e/login.spec.ts` — Playwright E2E test for happy path: navigate to `/login`, fill username + password, click submit, assert URL is `/app/dashboard`; also test SSO button redirects; also test invalid credentials shows error message

13. Run `bun run typecheck` and `bun run lint` — verify no TypeScript errors or lint violations across all new files

14. Run `bun run test` — verify unit tests pass (auth-store.test.ts, any new hook tests)
