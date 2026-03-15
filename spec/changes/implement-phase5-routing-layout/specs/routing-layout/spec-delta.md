# Spec Delta — Routing & Layout

**Change**: `implement-phase5-routing-layout`
**Target spec**: `spec/specs/routing-layout/spec.md`

---

## ADDED Requirements

### Requirement: Auth Layout
WHEN a user navigates to `/login`,
the system SHALL render an `AuthLayout` — a full-viewport centered container with a Card holding the application logo and an `<Outlet>` for the login form — with no sidebar or topbar visible.

#### Scenario: Login page renders in auth layout
GIVEN the user navigates to `/login`
WHEN the route renders
THEN the AuthLayout Card SHALL be visible in the center of the viewport
AND the sidebar SHALL NOT be present
AND the topbar SHALL NOT be present

#### Scenario: Authenticated user redirected from login
GIVEN the user is already authenticated (token in auth store)
WHEN the user navigates to `/login`
THEN the system SHALL redirect to `/app/dashboard`

---

### Requirement: App Layout
WHEN an authenticated user accesses any `/app/*` route,
the system SHALL render an `AppLayout` consisting of a collapsible sidebar and a topbar, with route content rendered in the main area.

#### Scenario: App layout renders for authenticated user
GIVEN the user is authenticated
WHEN the user navigates to `/app/dashboard`
THEN the AppLayout SHALL render with sidebar, topbar, and main content area
AND the route's page component SHALL appear in the main area

#### Scenario: Layout adapts on mobile
GIVEN the viewport width is less than 768px
WHEN the AppLayout renders
THEN the sidebar SHALL be hidden by default
AND a hamburger button SHALL be visible in the topbar
AND tapping the hamburger SHALL open the sidebar as an overlay

---

### Requirement: Sidebar Navigation
WHEN the AppLayout is rendered,
the sidebar SHALL display navigation items filtered by the authenticated user's permissions.

#### Scenario: Admin sees HR item
GIVEN the user has permission `hr:read`
WHEN the sidebar renders
THEN the "HR" navigation item SHALL be visible

#### Scenario: Non-admin does not see HR item
GIVEN the user does not have permission `hr:read`
WHEN the sidebar renders
THEN the "HR" navigation item SHALL NOT be present in the DOM

#### Scenario: Active route highlighted
GIVEN the user is on `/app/dashboard`
WHEN the sidebar renders
THEN the "Dashboard" nav item SHALL have the active visual state
AND all other nav items SHALL have the inactive visual state

#### Scenario: Sidebar collapses on mobile nav
GIVEN the sidebar is open on mobile (overlay mode)
WHEN the user taps a navigation item
THEN the sidebar SHALL close after navigation

---

### Requirement: Topbar
WHEN the AppLayout is rendered,
the topbar SHALL show the authenticated user's name/avatar, a notification bell with unread badge, a language switcher, and a user dropdown menu.

#### Scenario: Notification badge reflects unread count
GIVEN the user has 3 unread notifications
WHEN the topbar renders
THEN the notification bell SHALL display a badge with "3"

#### Scenario: Zero unread count hides badge
GIVEN the user has 0 unread notifications
WHEN the topbar renders
THEN the notification bell badge SHALL NOT be visible

#### Scenario: Language switcher changes locale
GIVEN the user selects "RU" in the language switcher
WHEN the selection is made
THEN `useUIStore().locale` SHALL be set to `"ru"`
AND the i18n instance SHALL switch to Russian translations

#### Scenario: User dropdown shows logout
GIVEN the user clicks their avatar in the topbar
WHEN the dropdown menu opens
THEN a "Logout" option SHALL be visible
AND clicking it SHALL call `useLogout()` mutation

---

### Requirement: Authentication Guard
WHEN a user accesses any `/app/*` route without being authenticated,
the system SHALL redirect the user to `/login` before rendering the route.

#### Scenario: Unauthenticated redirect
GIVEN the user is not authenticated (no token in auth store)
WHEN the user navigates to `/app/dashboard`
THEN the system SHALL redirect to `/login`
AND the originally requested path SHALL be preserved for post-login redirect

#### Scenario: Authenticated access proceeds
GIVEN the user is authenticated
WHEN the user navigates to `/app/dashboard`
THEN the route SHALL render normally without redirect

---

### Requirement: Permission Guard
WHEN a user without the required permission accesses a restricted route,
the system SHALL redirect to `/app/dashboard`.

#### Scenario: HR route blocked for non-admin
GIVEN the user does not have `hr:read` permission
WHEN the user navigates to `/app/hr`
THEN the system SHALL redirect to `/app/dashboard`

#### Scenario: AI chat blocked when feature disabled
GIVEN `VITE_AI_ENABLED` environment variable is not `"true"`
WHEN the user navigates to `/app/ai-chat`
THEN the system SHALL redirect to `/app/dashboard`

---

### Requirement: Route Loaders
WHEN a user navigates to any `/app/*` data route,
the system SHALL call `queryClient.ensureQueryData()` in the route loader to prefetch the primary domain data before the component renders.

#### Scenario: Data available on render
GIVEN the user navigates to `/app/employees`
WHEN the route loader runs before render
THEN the `useUsers` query SHALL be in the QueryClient cache
AND the EmployeesPage SHALL render without triggering an additional network request on mount

#### Scenario: Pending UI during loader
GIVEN the route loader is in flight (data not yet cached)
WHEN the router is rendering
THEN TanStack Router's built-in pending boundary SHALL display a loading indicator

---

### Requirement: 404 Route
WHEN a user navigates to a URL that does not match any defined route,
the system SHALL render a 404 not-found page.

#### Scenario: Unknown path shows 404
GIVEN the user navigates to `/app/unknown-feature`
WHEN the router evaluates the URL
THEN the 404 page SHALL render with a "Page not found" message
AND a link back to `/app/dashboard` SHALL be present

---

### Requirement: Error Boundary Route
WHEN a route component or loader throws an unhandled error,
the system SHALL catch it with an error boundary and render a user-friendly error fallback.

#### Scenario: Render error caught
GIVEN a page component throws a JavaScript error during render
WHEN the error propagates to the nearest error boundary
THEN the `ErrorFallback` component SHALL render in place of the broken page
AND a "Try again" button SHALL allow the user to reset the error boundary

#### Scenario: Loader error caught
GIVEN a route loader rejects (e.g., 500 from server)
WHEN the router's error boundary catches the thrown error
THEN the `ErrorFallback` component SHALL render
AND the error message SHALL be displayed to the user
