# Spec Delta — Auth, RBAC, Sessions

**Change**: `implement-phase6-auth-rbac`
**Target spec**: `spec/specs/auth/spec.md`

---

## ADDED Requirements

### Requirement: Login Form
WHEN a user navigates to `/login` and submits valid credentials,
the system SHALL call `POST /api/v1/auth/login` with `username` and `password`, store the returned access token in the Zustand auth store, and redirect the user to `/app/dashboard`.

#### Scenario: Successful login redirects to dashboard
GIVEN a user is on `/login`
WHEN the user enters valid username and password and submits the form
THEN the system SHALL call `POST /api/v1/auth/login`
AND store the access token in `useAuthStore`
AND `isAuthenticated` SHALL be `true`
AND the browser SHALL navigate to `/app/dashboard`

#### Scenario: Invalid credentials shows error
GIVEN a user is on `/login`
WHEN the user enters incorrect username or password and submits the form
THEN the system SHALL display an error message derived from the API response
AND the user SHALL remain on `/login`
AND `isAuthenticated` SHALL remain `false`

#### Scenario: Submit button shows loading state
GIVEN the user submits the login form
WHEN the mutation is in flight
THEN the submit button SHALL be disabled
AND a loading spinner SHALL be visible

#### Scenario: Form validation blocks empty submit
GIVEN the user attempts to submit with empty username or password
WHEN Zod validation runs
THEN the form SHALL display field-level error messages
AND the mutation SHALL NOT be called

---

### Requirement: SSO Login
WHEN a user clicks the SSO button on the login page,
the system SHALL redirect the browser to `GET /api/v1/auth/sso/login` to initiate the Authentik OIDC flow.

#### Scenario: SSO button redirects to provider
GIVEN a user is on `/login`
WHEN the user clicks the "Sign in with SSO" button
THEN the browser SHALL navigate to `/api/v1/auth/sso/login`

---

### Requirement: Token Refresh
WHEN an authenticated API request receives a 401 response,
the system SHALL attempt to refresh the access token by calling `POST /api/v1/auth/refresh` (using the httpOnly refresh cookie), retry the original request once with the new token, and only redirect to `/login` if the refresh itself fails.

#### Scenario: Transparent refresh on 401
GIVEN the user is authenticated and the access token has expired
WHEN an API request returns 401
THEN the system SHALL call `POST /api/v1/auth/refresh`
AND retry the original request with the new access token
AND the user SHALL NOT be redirected to `/login`

#### Scenario: Logout on refresh failure
GIVEN the access token is expired and the refresh token is invalid or expired
WHEN `POST /api/v1/auth/refresh` returns a non-2xx response
THEN the system SHALL call `clearAuth()`
AND redirect the user to `/login`

#### Scenario: No refresh loop
GIVEN the refresh endpoint itself returns 401
WHEN the response interceptor processes the error
THEN the system SHALL NOT attempt a second refresh
AND SHALL redirect to `/login` immediately

---

### Requirement: Logout
WHEN a user triggers logout,
the system SHALL call `POST /api/v1/auth/logout` (best-effort), clear the Zustand auth store, clear the QueryClient cache, and redirect to `/login`.

#### Scenario: Logout clears state and redirects
GIVEN an authenticated user clicks "Logout" in the topbar dropdown
WHEN `useLogout` mutation is called
THEN `clearAuth()` SHALL be called on the auth store
AND `queryClient.clear()` SHALL be called
AND the browser SHALL navigate to `/login`
AND `isAuthenticated` SHALL be `false`

#### Scenario: Logout proceeds even if API call fails
GIVEN the backend logout endpoint returns an error
WHEN the mutation resolves
THEN the system SHALL still call `clearAuth()` and redirect to `/login`

---

### Requirement: Permission Map
WHEN the application initialises,
the system SHALL have a static `ROLE_PERMISSIONS` map that translates JWT roles (`admin`, `manager`, `employee`, `hr`) into typed permission strings.

#### Scenario: Admin has all permissions
GIVEN a user has role `admin`
WHEN `usePermissions().can("hr:read")` is called
THEN the result SHALL be `true`

#### Scenario: Employee cannot view HR
GIVEN a user has role `employee`
WHEN `usePermissions().can("hr:read")` is called
THEN the result SHALL be `false`

#### Scenario: Multiple roles union permissions
GIVEN a user has roles `["manager", "hr"]`
WHEN `usePermissions().can("hr:read")` is called
THEN the result SHALL be `true` (union of both roles' sets)

---

### Requirement: Permission Hook
WHEN a component calls `usePermissions()`,
the system SHALL return `{ can: (permission: string) => boolean }` derived from the current user's `permissions` array in the auth store.

#### Scenario: can() returns true for granted permission
GIVEN `useAuthStore().permissions` contains `"reports.view"`
WHEN `usePermissions().can("reports.view")` is called
THEN the result SHALL be `true`

#### Scenario: can() returns false for missing permission
GIVEN `useAuthStore().permissions` does not contain `"hr:read"`
WHEN `usePermissions().can("hr:read")` is called
THEN the result SHALL be `false`

---

### Requirement: Guard Component
WHEN a `<Guard permission="...">` component is rendered,
the system SHALL render its children if the current user has the specified permission, and render nothing (`null`) otherwise.

#### Scenario: Authorized user sees guarded content
GIVEN the user has permission `"reports.view"`
WHEN `<Guard permission="reports.view"><ReportLink /></Guard>` renders
THEN `<ReportLink />` SHALL be present in the DOM

#### Scenario: Unauthorized user sees nothing
GIVEN the user does not have permission `"hr:read"`
WHEN `<Guard permission="hr:read"><HrMenu /></Guard>` renders
THEN `<HrMenu />` SHALL NOT be present in the DOM

---

### Requirement: Route Permission Guard
WHEN a user without the required permission navigates to a restricted `/app/*` route,
the system SHALL redirect the user to `/app/dashboard` via `beforeLoad`.

#### Scenario: HR route blocked for non-hr role
GIVEN a user does not have `hr:read` permission
WHEN the user navigates to `/app/hr`
THEN the system SHALL redirect to `/app/dashboard`

#### Scenario: CapEx report blocked without permission
GIVEN a user does not have `reports.view` permission
WHEN the user navigates to `/app/reports/capex`
THEN the system SHALL redirect to `/app/dashboard`

---

### Requirement: Inactivity Timeout
WHEN an authenticated user has been inactive for 30 minutes,
the system SHALL log the user out and redirect to `/login`; a warning SHALL be shown at 25 minutes of inactivity.

#### Scenario: Warning shown at 25 minutes
GIVEN an authenticated user is on any `/app/*` page
WHEN 25 minutes pass without any mouse, keyboard, or touch activity
THEN the system SHALL display an inactivity warning to the user

#### Scenario: Logout triggered at 30 minutes
GIVEN the inactivity warning has been shown and the user has not interacted
WHEN 30 minutes of total inactivity pass
THEN `useLogout` SHALL be called
AND the user SHALL be redirected to `/login`

#### Scenario: Activity resets the timer
GIVEN the user moves the mouse or presses a key
WHEN the event fires
THEN the inactivity countdown SHALL reset to zero

---

### Requirement: Remember Me
WHEN a user checks "Remember me" before submitting the login form,
the system SHALL note the preference (future: extend token TTL or persist session beyond browser close); for Phase 6 this flag is submitted but has no additional client-side effect beyond being included in the form state.

#### Scenario: Remember me checkbox is present on login page
GIVEN a user is on `/login`
WHEN the LoginForm renders
THEN a "Remember me" checkbox SHALL be visible
AND it SHALL be unchecked by default
