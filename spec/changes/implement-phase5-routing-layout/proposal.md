# Proposal: Implement Phase 5 — Routing & Layout

**Change ID**: `implement-phase5-routing-layout`
**Branch**: `feature/phase-5-routing-layout`
**Date**: 2026-03-15

---

## Why

Phases 0–4 delivered: foundation, API types, design system, shared components, and the full data layer (hooks, stores, QueryClient). The application has no navigation structure yet — `src/routes/` and `src/layouts/` are empty, and `main.tsx` contains a Phase 0 placeholder router with a single static route.

Phase 5 wires everything together: layouts define the shell UI (auth card vs. app shell with sidebar + topbar), routes map URLs to page skeletons, route loaders prefetch domain data before render, and guards redirect unauthenticated users. Without this, no feature page can be assembled in Phase 6.

---

## What Changes

### New files

| File | Purpose |
|---|---|
| `src/layouts/auth-layout.tsx` | Centered card layout for login (no sidebar) |
| `src/layouts/app-layout.tsx` | Full app shell: sidebar + topbar outlet |
| `src/layouts/components/sidebar.tsx` | Collapsible sidebar with permission-filtered nav items |
| `src/layouts/components/topbar.tsx` | Topbar: user menu, language switcher, notification bell |
| `src/layouts/components/nav-item.tsx` | Single sidebar navigation item with icon + label |
| `src/routes/__root.tsx` | TanStack Router root route with QueryClient context provider |
| `src/routes/_auth.tsx` | Auth layout route (parent for `/login`) |
| `src/routes/_auth.login.tsx` | Login page route |
| `src/routes/_app.tsx` | App layout route (parent for all `/app/*`), auth guard |
| `src/routes/_app.dashboard.tsx` | Dashboard page route with loader |
| `src/routes/_app.journal.tsx` | Journal page route with loader |
| `src/routes/_app.my-timesheet.tsx` | My Timesheet page route with loader |
| `src/routes/_app.org.tsx` | Org chart page route with loader |
| `src/routes/_app.employees.tsx` | Employees list page route with loader |
| `src/routes/_app.employees.$id.tsx` | Employee detail page route with loader |
| `src/routes/_app.projects.tsx` | Projects list page route with loader |
| `src/routes/_app.projects.$id.tsx` | Project detail page route with loader |
| `src/routes/_app.reports.tsx` | Reports layout route (parent for capex/opex) |
| `src/routes/_app.reports.capex.tsx` | CapEx report page with loader |
| `src/routes/_app.reports.opex.tsx` | OpEx report page with loader |
| `src/routes/_app.approvals.tsx` | Approvals page route with loader |
| `src/routes/_app.control-sheet.tsx` | Control Sheet page route with loader |
| `src/routes/_app.leave.tsx` | Leave management page route with loader |
| `src/routes/_app.notifications.tsx` | Notifications page route with loader |
| `src/routes/_app.settings.tsx` | Settings page route |
| `src/routes/_app.hr.tsx` | HR admin page route (Admin/HR permission guard) |
| `src/routes/_app.ai-chat.tsx` | AI Chat page route (feature-flag guard) |
| `src/routes/404.tsx` | Not-found route |
| `src/routes/error.tsx` | Error boundary route |

### Modified files

| File | Change |
|---|---|
| `src/main.tsx` | Replace placeholder router with `createRouter({ routeTree })` from generated route tree; add `RouterProvider`; wrap in `QueryClientProvider` + `ToastProvider` |
| `src/lib/toast.ts` | Replace stub with real toast wired to shadcn `<Toaster>` |

---

## Impact

**Affected specs**: new `routing-layout` spec created (no existing spec modified)

**Affected code**:
- `src/main.tsx` — full rewrite of router setup
- All feature hooks in `src/features/*/hooks/` consumed by route loaders
- `useAuthStore` consumed by `_app.tsx` guard and sidebar permission filter
- `useUIStore` consumed by sidebar (sidebarOpen/toggleSidebar) and topbar (locale)

**User-facing**:
- Navigation between pages works end-to-end
- Login redirects to `/app/dashboard` on success
- Unauthenticated access to `/app/*` redirects to `/login`
- Sidebar collapses on mobile
- Topbar shows authenticated user name + avatar, notification badge, language switcher
- 404 page shown for unknown URLs
- Error boundary catches unexpected render errors
