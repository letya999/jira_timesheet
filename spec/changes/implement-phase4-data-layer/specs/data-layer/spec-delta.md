# Spec Delta — Data Layer

**Change**: `implement-phase4-data-layer`
**Target spec**: `spec/specs/data-layer/spec.md`

---

## ADDED Requirements

### Requirement: QueryClient Configuration
WHEN the application initialises,
the system SHALL create a QueryClient with staleTime of 60 seconds, gcTime of 5 minutes, and a retry policy that attempts up to 3 times with exponential backoff and skips retries for 401, 403, and 404 status codes.

#### Scenario: Skip retry on auth error
GIVEN a query that fails with HTTP 401
WHEN the query error handler runs
THEN the system SHALL NOT retry the query
AND SHALL redirect to the login page via the API client interceptor

#### Scenario: Retry on server error
GIVEN a query that fails with HTTP 500
WHEN the query error handler runs
THEN the system SHALL retry up to 3 times
AND SHALL display a toast notification if all retries fail

---

### Requirement: Global Error Toasts
WHEN a query or mutation fails with a server error (5xx) or network error,
the system SHALL display a toast notification to the user.

#### Scenario: 5xx server error toast
GIVEN any query receives a 5xx response
WHEN the QueryCache onError handler fires
THEN a toast with message "Server error. Please try again later." SHALL appear

#### Scenario: Network error toast
GIVEN any query fails with no status (network unreachable)
WHEN the QueryCache onError handler fires
THEN a toast with message "Network error. Check your connection." SHALL appear

---

### Requirement: Auth Store Persistence
WHEN a user successfully authenticates,
the system SHALL persist user profile, token, and permissions to localStorage so that state survives page reload.

#### Scenario: Auth state persists across reload
GIVEN a user has logged in and the token is stored
WHEN the user reloads the page
THEN useAuthStore SHALL return the previously stored user and token
AND isAuthenticated SHALL be true

#### Scenario: Logout clears persisted state
GIVEN a user is authenticated
WHEN useLogout mutation is called
THEN the auth store SHALL clear all state
AND localStorage SHALL no longer contain the auth token
AND the QueryClient cache SHALL be cleared

---

### Requirement: Session-Only UI State
WHEN the application is running,
the system SHALL maintain sidebar state, active locale, active filters, and selected period in session-only Zustand store (not persisted to localStorage).

#### Scenario: UI state does not survive reload
GIVEN the user has opened the sidebar and set filters
WHEN the user reloads the page
THEN sidebarOpen SHALL reset to its default value
AND activeFilters SHALL be empty

---

### Requirement: Optimistic Timesheet Mutations
WHEN a user creates, updates, or deletes a timesheet entry,
the system SHALL apply the change to the QueryClient cache immediately and roll back if the mutation fails.

#### Scenario: Optimistic create entry
GIVEN a user submits a new timesheet entry
WHEN the mutation is in flight
THEN the entry SHALL appear in the timesheet list immediately
AND a loading indicator SHALL be shown

#### Scenario: Rollback on create failure
GIVEN an optimistic timesheet entry has been added to the cache
WHEN the mutation fails
THEN the entry SHALL be removed from the cache
AND a toast error SHALL be shown

#### Scenario: Optimistic delete entry
GIVEN a timesheet entry exists in the cache
WHEN useDeleteEntry mutation fires
THEN the entry SHALL disappear from the list immediately
AND SHALL be restored if the mutation fails

---

### Requirement: Optimistic Notification Read
WHEN a user marks a notification as read,
the system SHALL update the notification state in the cache immediately and roll back if the request fails.

#### Scenario: Mark as read optimistic
GIVEN an unread notification in the cache
WHEN useMarkAsRead is called
THEN the notification SHALL show as read in the UI immediately
AND SHALL revert to unread if the mutation fails

---

### Requirement: Notification Polling
WHEN the user is authenticated and on any page,
the system SHALL refetch notifications every 30 seconds.

#### Scenario: Notification count updates automatically
GIVEN the user is on the dashboard
WHEN 30 seconds elapse
THEN useNotifications SHALL automatically refetch
AND the notification badge count SHALL update without a page reload

---

### Requirement: URL Search Param Schemas
WHEN navigating with filters, pagination, or date ranges,
the system SHALL encode these as validated URL search parameters using Zod schemas so that links are shareable and browser back/forward navigation works.

#### Scenario: Filter survives page refresh
GIVEN a user has applied date range and status filters
WHEN the user copies and opens the URL in a new tab
THEN the same filters SHALL be active
AND the same data SHALL be displayed

#### Scenario: Pagination state in URL
GIVEN a user is on page 3 of the worklogs list
WHEN the user presses browser back
THEN the user SHALL return to page 2

---

### Requirement: ReactQueryDevtools Visibility
WHEN the application is running in development mode,
the system SHALL render ReactQueryDevtools so developers can inspect cache state.

#### Scenario: Devtools absent in production
GIVEN the app is built with NODE_ENV=production
WHEN any page is loaded
THEN ReactQueryDevtools SHALL NOT be present in the DOM
