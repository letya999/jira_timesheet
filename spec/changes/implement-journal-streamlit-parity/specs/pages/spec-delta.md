# Spec Delta - Journal Streamlit Parity

## ADDED Requirements

### Requirement: Journal Filter Panel Matches Legacy Streamlit Flow
The system SHALL render a collapsible filter panel at the top of `/app/journal` with controls equivalent to the legacy Streamlit journal.

#### Scenario: Default date range equals last 90 days
GIVEN the user opens `/app/journal`
WHEN filters initialize
THEN start date SHALL default to today minus 90 days
AND end date SHALL default to today.

#### Scenario: Filter controls map to backend API
GIVEN a user changes project/team/category/sort/date/page-size controls
WHEN the page refetches data
THEN request SHALL call `GET /api/v1/timesheet` with corresponding query params.

#### Scenario: Filter change resets page
GIVEN the user is on page N > 1
WHEN any filter value changes
THEN current page SHALL reset to page 1 before fetch.

### Requirement: Journal Uses Worklog Cards Like Streamlit
The system SHALL display journal entries as vertically stacked cards instead of a generic data table.

#### Scenario: Card content parity
GIVEN a worklog exists in response
WHEN card renders
THEN it SHALL show user name, logged hours, issue key/summary title, project, category, logged timestamp, and work date.

#### Scenario: Empty state
GIVEN no worklogs match the filters
WHEN cards section renders
THEN user SHALL see an explicit "Записей не найдено." message.

### Requirement: Journal Pagination and Page Size Are Explicit
The system SHALL display visible total counters and page controls consistent with legacy navigation.

#### Scenario: Counter line is visible
GIVEN entries are loaded
WHEN list renders
THEN UI SHALL show "Показано X из Y записей" above card list.

#### Scenario: Page-size slider affects backend size
GIVEN user changes slider value
WHEN request is sent
THEN backend `size` param SHALL equal selected value.
