# Proposal: implement-phase6-auth-rbac

## Why

The application currently has an unsecured skeleton — Phase 5 delivered routing and layouts, but the login page is a placeholder and there is no real authentication flow. Any URL under `/app/*` is accessible without credentials if a user manually sets `isAuthenticated: true` in localStorage. There is no token refresh, no role-based access control, and no session expiry. This change secures the application end-to-end.

## What Changes

### Auth Mutations & API Integration
- `useLogin` mutation: calls `POST /api/v1/auth/login` (OAuth2 password grant), stores access token in Zustand + updates `auth_store` persist key, navigates to `/app/dashboard`
- `useLogout` mutation: calls `POST /api/v1/auth/logout` (best-effort), clears Zustand auth store, clears QueryClient cache, redirects to `/login`
- `useSsoLogin`: redirects browser to `/api/v1/auth/sso/login` for Authentik OIDC flow

### Token Refresh
- Upgrade `web/src/api/client.ts` interceptor: on 401 response, call `POST /api/v1/auth/refresh` (httpOnly cookie carries refresh token), retry original request once; if refresh fails, call `clearAuth()` and redirect to `/login`

### RBAC
- `web/src/lib/permissions.ts`: defines `ROLE_PERMISSIONS` map — each role (`admin`, `manager`, `employee`, `hr`) maps to a `Set<string>` of permission strings
- `usePermissions()` hook: reads `permissions` from auth store, returns `{ can: (p: string) => boolean }`
- `<Guard permission="...">`: renders children only if `can(permission)` is true, null otherwise
- Route `beforeLoad` guards extended with permission check (e.g. `/app/hr` requires `hr:read`)

### Login Page (Task 07 — P0)
- Replace `_auth.login.tsx` stub with full `LoginPage`
- `LoginForm` organism: React Hook Form + Zod schema, username/password fields, "Remember me" checkbox, submit button with loading state, error message display
- SSO button: triggers `useSsoLogin`, styled as outlined variant

### Session Management
- `useInactivityTimer(timeoutMs, warnMs, onWarn, onTimeout)`: tracks mouse/keyboard/touch events, calls `onWarn` at 25 min, calls `onTimeout` (→ `useLogout`) at 30 min
- Wired into `AppLayout` so it runs for all authenticated sessions

### E2E Tests
- `tests/e2e/login.spec.ts`: Playwright happy-path test — fill username/password, submit, assert redirect to `/app/dashboard`

## Impact

**Specs affected**: New capability `spec/specs/auth/`

**Files created**:
- `web/src/lib/permissions.ts`
- `web/src/features/auth/hooks/use-login.ts`
- `web/src/features/auth/hooks/use-logout.ts`
- `web/src/features/auth/hooks/use-permissions.ts`
- `web/src/features/auth/hooks/use-inactivity-timer.ts`
- `web/src/features/auth/hooks/index.ts`
- `web/src/components/shared/guard.tsx`
- `tests/e2e/login.spec.ts`

**Files modified**:
- `web/src/routes/_auth.login.tsx` — replace placeholder with full LoginPage
- `web/src/api/client.ts` — add token refresh interceptor
- `web/src/routes/_app.tsx` — wire `useInactivityTimer`

**APIs consumed**:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/sso/login`

**Users impacted**: All — this is the entry point for every user.

**Dependencies confirmed (phases 0-5)**:
- `useAuthStore` — setAuth, clearAuth, permissions ✓
- `@hey-api/client-fetch` interceptors ✓
- TanStack Router `beforeLoad` + `redirect` ✓
- React Hook Form, Zod, shadcn/ui Button/Input/Card/Checkbox ✓
- QueryClient ✓
