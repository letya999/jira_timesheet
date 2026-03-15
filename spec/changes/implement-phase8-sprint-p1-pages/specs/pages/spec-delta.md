# Spec Delta — Sprint P1 Core Pages

**Change**: `implement-phase8-sprint-p1-pages`
**Target spec**: `spec/specs/pages/spec.md` (new capability)

---

## ADDED Requirements

### Requirement: Dashboard Page
WHEN an authenticated user navigates to `/app/dashboard`,
the system SHALL display four KPI summary cards (This Week, This Month, CapEx total, OpEx total), a Jira sync status widget, and a table of the user's ten most recent worklog entries.

#### Scenario: KPI cards render with current period data
GIVEN a user navigates to `/app/dashboard`
WHEN the page loads
THEN four `ReportSummaryCard` components SHALL be visible
AND the "This Week" card SHALL show total, capex, and opex hours for the current calendar week (Mon–Sun)
AND the "This Month" card SHALL show total, capex, and opex hours for the current calendar month
AND the "CapEx Total" card SHALL show month-to-date CapEx hours and percentage
AND the "OpEx Total" card SHALL show month-to-date OpEx hours and percentage

#### Scenario: Skeleton shown while data loads
GIVEN a user navigates to `/app/dashboard`
WHEN the API requests are in flight
THEN skeleton placeholder elements SHALL be visible in place of data
AND the page SHALL NOT display zero values as real data until the request completes

#### Scenario: Sync widget triggers sync and polls status
GIVEN a user is on `/app/dashboard`
WHEN the user clicks "Sync Now"
THEN `POST /api/v1/sync/worklogs` SHALL be called
AND the widget status SHALL transition to `syncing`
AND the system SHALL poll `GET /api/v1/sync/jobs/{job_id}` every 3 seconds until `status` is `complete` or `failed`
AND on completion the widget status SHALL transition to `success` or `error` accordingly

#### Scenario: Recent worklogs table shows last 10 entries
GIVEN a user navigates to `/app/dashboard`
WHEN the page loads with worklog data
THEN a data table SHALL render with columns: Date, Project, Issue, Hours, Type, Status
AND at most 10 rows SHALL be shown
AND each row SHALL correspond to one `WorklogResponse` entry

#### Scenario: Empty state when no worklogs exist
GIVEN a user has no logged worklogs in the current period
WHEN the page loads
THEN the data table SHALL display an empty-state message
AND the KPI cards SHALL show 0h for total, capex, and opex

---

### Requirement: My Timesheet Page
WHEN an authenticated user navigates to `/app/my-timesheet`,
the system SHALL display a weekly timesheet grid for the current week with inline editable hour cells and a modal form for logging new entries.

#### Scenario: Timesheet grid shows current week
GIVEN a user navigates to `/app/my-timesheet`
WHEN the page loads
THEN the week navigation header SHALL display the current week range (e.g. "Week of Mar 10 – 16, 2026")
AND the grid SHALL display column headers for Mon through Sun of the current week
AND rows SHALL be populated from `GET /api/v1/timesheet/worklogs` filtered to the displayed week

#### Scenario: Week navigation moves backward and forward
GIVEN a user is viewing the current week on `/app/my-timesheet`
WHEN the user clicks "< Prev"
THEN the displayed week SHALL shift back by 7 days
AND the system SHALL refetch worklogs for the new date range
WHEN the user clicks "Next >"
THEN the displayed week SHALL advance by 7 days

#### Scenario: Inline cell edit triggers optimistic update
GIVEN a user is on `/app/my-timesheet` with a loaded timesheet grid
WHEN the user modifies an hour cell value
THEN the cell SHALL immediately reflect the new value (optimistic update)
AND the system SHALL attempt to persist the change via the update mutation
AND on API error the cell SHALL revert to the previous value
AND a toast error SHALL be displayed

#### Scenario: "Log Time" opens the entry form modal
GIVEN a user is on `/app/my-timesheet`
WHEN the user clicks the "Log Time" button
THEN a dialog SHALL open containing the `WorklogEntryForm`
AND the dialog title SHALL be "Log Time"

#### Scenario: Submitting Log Time form creates entry and closes dialog
GIVEN the user has filled out the `WorklogEntryForm` with valid data
WHEN the user clicks "Log Work"
THEN `POST /api/v1/timesheet/manual` SHALL be called
AND an optimistic entry SHALL appear in the grid immediately
AND the dialog SHALL close on successful submission
AND on error the optimistic entry SHALL be rolled back and a toast error displayed

#### Scenario: Skeleton shown while week data loads
GIVEN a user navigates to or changes weeks on `/app/my-timesheet`
WHEN the API request is in flight
THEN skeleton rows SHALL be displayed in the grid in place of real data

---

### Requirement: Journal Page
WHEN an authenticated user navigates to `/app/journal`,
the system SHALL display a paginated, filterable list of all worklog entries accessible to the user, with columns showing date, project, issue, hours, type, status, and category.

#### Scenario: Journal loads with default date range
GIVEN a user navigates to `/app/journal`
WHEN the page loads
THEN the date range filter SHALL default to the first day of the current month through today
AND the data table SHALL display worklogs within that range
AND the columns SHALL be: Date, Project, Issue, Hours, Type, Status, Category

#### Scenario: Date range filter updates displayed entries
GIVEN a user is on `/app/journal`
WHEN the user selects a new date range in the filter bar
THEN `GET /api/v1/timesheet` SHALL be called with the updated `start_date` and `end_date`
AND the data table SHALL refresh to show only entries within the new range
AND the current page SHALL reset to 1

#### Scenario: Pagination controls navigate between pages
GIVEN the journal has more entries than the page size (default 20)
WHEN the user clicks to the next page via the pagination bar
THEN the system SHALL call `GET /api/v1/timesheet` with `skip = (page - 1) * pageSize` and `limit = pageSize`
AND the data table SHALL display the correct page of results

#### Scenario: Status column uses StatusBadge
GIVEN the journal table is displaying worklog entries
WHEN a row has `status = "APPROVED"`
THEN the status cell SHALL render a `StatusBadge` component with the appropriate variant
AND the badge SHALL NOT be an editable input

#### Scenario: Issue key links to Jira
GIVEN the journal table is displaying a worklog with a non-null `issue_key`
WHEN the row renders
THEN the issue_key cell SHALL render a `JiraKeyLink` component
AND clicking it SHALL open the Jira issue in a new tab

#### Scenario: Empty state when no entries match filter
GIVEN the user has selected a date range with no matching worklogs
WHEN the table renders
THEN a "No results" empty state SHALL be displayed in the table body
AND the pagination bar SHALL show total = 0
