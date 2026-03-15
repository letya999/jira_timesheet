# Implementation Tasks — Phase 5 Routing & Layout

## Layouts

1. Create `src/layouts/components/nav-item.tsx` — single sidebar nav item: icon + label + active state, accepts `to` (route path), `icon` (Lucide), `label`, optional `permission` prop; renders nothing if permission not in `useAuthStore().permissions`

2. Create `src/layouts/components/topbar.tsx` — fixed top bar: left slot (hamburger for mobile sidebar toggle using `useUIStore().toggleSidebar`), center/right slot with notification bell (`useNotifications` badge count), language switcher (`<LanguageSwitcher>`), user dropdown (avatar + name from `useCurrentUser`, logout action via `useLogout`)

3. Create `src/layouts/components/sidebar.tsx` — collapsible sidebar: `useUIStore().sidebarOpen` drives open/collapsed state; nav items list defined as constant array `{ to, icon, label, permission? }[]`; renders `<NavItem>` for each; on mobile overlays with a backdrop click to close; on desktop pushes main content

4. Create `src/layouts/auth-layout.tsx` — full-viewport centered flex container; renders a Card with logo (SVG or `assets/logo.svg` fallback text), subtitle, and `<Outlet />` for login form; no sidebar; light background with brand gradient

5. Create `src/layouts/app-layout.tsx` — root app shell: `<Sidebar>` + `<div className="flex-1 flex flex-col">` containing `<Topbar>` and `<main><Outlet /></main>`; applies `ml-64` (desktop) / `ml-0` (mobile) based on `sidebarOpen`; wraps children in `<Suspense fallback={<PageSkeleton />}>`

## Router Setup

6. Create `src/routes/__root.tsx` — TanStack Router root route: injects `QueryClient` via `RouterContext` (`router.context`); renders `<Outlet />`; adds `<ReactQueryDevtools>` in dev; wraps with `<QueryClientProvider>` and `<Toaster>`

7. Create `src/routes/_auth.tsx` — pathless layout route using `createFileRoute('/_auth')`; renders `<AuthLayout><Outlet /></AuthLayout>`; if user is already authenticated, redirect to `/app/dashboard`

8. Create `src/routes/_auth.login.tsx` — route `path: '/login'`; renders placeholder `<LoginPage />` component (heading + "Login form coming in Phase 6"); no loader needed

9. Create `src/routes/_app.tsx` — pathless layout route using `createFileRoute('/_app')`; **auth guard**: `beforeLoad` checks `context.auth.isAuthenticated`; if false, `throw redirect({ to: '/login' })`; renders `<AppLayout><Outlet /></AppLayout>`

10. Create all app page routes — for each route below, create the corresponding file with `createFileRoute`, a `loader` using `queryClient.ensureQueryData(...)` for the primary domain query, and a placeholder page component (`<h1>` with page name + `<p>Placeholder — Phase 6</p>`):
    - `_app.dashboard.tsx` — loader: `useTimesheetEntries` query key
    - `_app.journal.tsx` — loader: `useTimesheetEntries` query key
    - `_app.my-timesheet.tsx` — loader: `useTimesheetEntries` query key
    - `_app.org.tsx` — loader: `useOrgTree` query key
    - `_app.employees.tsx` — loader: `useUsers` query key
    - `_app.employees.$id.tsx` — loader: `useUser(params.id)` query key
    - `_app.projects.tsx` — loader: `useProjects` query key
    - `_app.projects.$id.tsx` — loader: `useProject(params.id)` query key
    - `_app.reports.tsx` — layout route only, no loader
    - `_app.reports.capex.tsx` — loader: `useCapexReport` query key
    - `_app.reports.opex.tsx` — loader: `useOpexReport` query key
    - `_app.approvals.tsx` — loader: `useApprovals` query key
    - `_app.control-sheet.tsx` — loader: `useTimesheetEntries` query key
    - `_app.leave.tsx` — loader: `useLeaveRequests` query key
    - `_app.notifications.tsx` — loader: `useNotifications` query key
    - `_app.settings.tsx` — no loader
    - `_app.hr.tsx` — `beforeLoad` permission guard: if `!permissions.includes('hr:read')`, throw redirect to `/app/dashboard`; loader: `useUsers` query key
    - `_app.ai-chat.tsx` — `beforeLoad` feature flag guard: if `import.meta.env.VITE_AI_ENABLED !== 'true'`, throw redirect to `/app/dashboard`; no loader

11. Create `src/routes/404.tsx` — `createFileRoute('/404')` or use `notFoundComponent` on root route; renders centered "404 — Page not found" with link back to `/app/dashboard`

12. Create `src/routes/error.tsx` — `errorComponent` exported for use on root and `_app` routes; renders `<ErrorFallback>` component from `src/components/shared/error-fallback.tsx` with reset button

## Main Entry Point

13. Update `src/main.tsx`:
    - Import `routeTree` from TanStack Router generated file (or manual tree)
    - Create router: `const router = createRouter({ routeTree, context: { queryClient } })`
    - Wrap `<RouterProvider router={router} />` in `<QueryClientProvider client={queryClient}>`
    - Add `<Toaster />` from shadcn
    - Remove Phase 0 placeholder routes

14. Update `src/lib/toast.ts` — replace stub with real implementation using shadcn `toast()` from `@/components/ui/use-toast`

## Validation

15. Run `bun dev` and verify: `/login` renders AuthLayout, `/app/dashboard` redirects to `/login` when unauthenticated, sidebar toggles on mobile, topbar shows user info (via MSW mock), all `/app/*` routes render without console errors, `/unknown-path` shows 404

16. Run `bun lint` and fix any TypeScript/ESLint errors
