# Task 06: Phase 6 — Auth, RBAC, Sessions

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
