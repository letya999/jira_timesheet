# Task 01: Phase 1 — API Contract (SDD Foundation)

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
- [ ] `bun run api:generate` runs without errors
- [ ] All endpoints produce typed response shapes
- [ ] Client interceptors handle auth errors globally
