# Spec Delta — Report Builder Page

**Change**: `implement-phase9-report-builder`
**Target spec**: `spec/specs/pages/spec.md` (existing capability — add requirement)

---

## ADDED Requirements

### Requirement: Report Builder Page

WHEN an authenticated user with `reports.view` permission navigates to `/app/reports`,
the system SHALL display a full-featured pivot table report builder that mirrors the functionality of the Streamlit Report Builder.

#### Scenario: Page renders at index route

GIVEN an authenticated user navigates to `/app/reports`
WHEN the route resolves
THEN the page SHALL display the title "Report Builder"
AND the Data Source Filters panel SHALL be visible and expanded
AND the Pivot Configuration panel SHALL be visible
AND no results section SHALL be shown (results appear only after Run is clicked)
AND the URL SHALL remain `/app/reports` (not redirect to a sub-route)

#### Scenario: Data Source Filters — all 4 columns render

GIVEN the Report Builder page is loaded
WHEN the filter panel renders
THEN Column 1 SHALL contain a DateRangePicker (default: last 30 days to today) and a Categories multi-select combobox
AND Column 2 SHALL contain a Project single-select combobox, conditionally a Release single-select (visible only when a project is selected), and a Sprints multi-select combobox
AND Column 3 SHALL contain a Team single-select combobox (visible only for Admin/CEO/PM roles) and a Worklog Type multi-select (options: JIRA, MANUAL)
AND Column 4 SHALL contain an Employees multi-select combobox (visible only for Admin/CEO/PM roles)
AND Employee role users SHALL see informational text in Col 3 and Col 4 instead of the restricted controls
AND all dropdown controls SHALL show skeleton placeholders while their data is loading via React Query

#### Scenario: Project→Release cascade

GIVEN the user selects a project in the Project combobox
WHEN the project is selected
THEN a Release combobox SHALL appear below the Project combobox
AND the Release combobox SHALL load releases for the selected project via `GET /api/v1/projects/{project_id}/releases`
AND selecting a different project SHALL reset the Release selection to null

GIVEN the user has NOT selected a project
WHEN the filter panel renders
THEN the Release combobox SHALL NOT be visible
AND an info text "Select a project to filter by release" SHALL be shown in its place

#### Scenario: Pivot Configuration — row and column dimensions

GIVEN the Report Builder page is loaded
WHEN the Pivot Config panel renders
THEN a Row Dimensions multi-select SHALL be visible with all 11 options: user, project, task, release, sprint, team, division, department, date, category, type
AND default selected rows SHALL be ['user', 'project']
AND a Column Dimensions multi-select SHALL be visible with the same 11 options (excluding those already selected as rows)
AND default selected columns SHALL be ['date']

#### Scenario: Pivot Configuration — value format and granularity

GIVEN the Pivot Config panel is visible
WHEN the user changes the value unit
THEN a RadioGroup with options "Hours" and "Days" SHALL be shown
AND selecting "Days" SHALL reveal a number input for "Hours per day" (default 8, min 1, max 24)
AND the Hours per day input SHALL be hidden when format is "Hours"

GIVEN the user has 'date' in either Row or Column dimensions
WHEN the Pivot Config panel renders
THEN a Date Granularity selector SHALL be visible with segments: Day, Week, 2 Weeks, Month, Quarter
AND default granularity SHALL be Week

GIVEN the user removes 'date' from both Row and Column dimensions
WHEN the Pivot Config panel updates
THEN the Date Granularity selector SHALL be hidden

#### Scenario: Run Report button validation

GIVEN the Row Dimensions multi-select is empty
WHEN the Pivot Config panel renders
THEN the "Run Report" button SHALL be disabled
AND an inline error message "At least one row dimension is required" SHALL be visible

GIVEN the user has the same dimension selected in both Row and Column multi-selects
WHEN the Pivot Config panel updates
THEN the "Run Report" button SHALL be disabled
AND an inline error message identifying the conflicting dimension(s) SHALL be visible

GIVEN row dimensions are non-empty and there is no row/column overlap
WHEN the user clicks "Run Report"
THEN `POST /api/v1/reports/custom` SHALL be called with the assembled `CustomReportRequest` payload
AND the button SHALL show a loading state while the request is in flight

#### Scenario: Results section — metrics

GIVEN the user has clicked "Run Report" and the API returns data
WHEN the results render
THEN four metric cards SHALL be displayed:
  - "Grand Total" = sum of all `value` fields in the response (in selected unit h or d)
  - "Total Hours" = sum of all `hours` fields (always in h)
  - "Employees" = count of unique `user` values
  - "Unique Tasks" = count of unique `task` values

#### Scenario: Results section — data table

GIVEN the API returns a `{ data: [...], columns: [...] }` response
WHEN the results render
THEN a data table SHALL be displayed with columns derived from the `columns` array in the response
AND if `columns` is empty, columns SHALL be derived from the keys of the first data row
AND numeric fields (value, hours) SHALL be right-aligned with one decimal place
AND the table SHALL support sorting by any column
AND the table SHALL use virtual scrolling for performance

#### Scenario: Results section — charts

GIVEN data is loaded after Run
WHEN the results render
THEN a chart panel SHALL be visible with three chart type buttons: Bar, Line, Pie
AND a "Color by" selector SHALL allow choosing any available dimension
AND the Bar chart SHALL group data by the first row dimension on the X axis, colored by the selected dimension
AND the Line chart SHALL be available only when 'date' is among the dimensions; x-axis = date granularity
AND selecting Line without a date dimension SHALL display an informational message
AND the Pie chart SHALL slice by the first row dimension with percentage labels

#### Scenario: Results section — export

GIVEN data is loaded after Run
WHEN the user clicks "Export Excel"
THEN `GET /api/v1/reports/export` SHALL be called with the current date range
AND the browser SHALL initiate a file download of the `.xlsx` file

#### Scenario: Active filter chips

GIVEN the user has applied one or more filters
WHEN the results section is visible
THEN a FilterBar SHALL display badge chips for each active filter (date range always shown)
AND clicking the X on a chip SHALL remove that filter from the filter state
AND clicking "Clear all" SHALL reset all filters to defaults

#### Scenario: Error and empty states

GIVEN the API returns an error
WHEN results would render
THEN a red error banner SHALL be shown: "Failed to load report data. Check your filters and try again."
AND the metrics, table, and chart SHALL NOT render

GIVEN the API returns an empty data array
WHEN results render
THEN the metrics, table, and chart SHALL NOT render
AND an empty-state message SHALL be shown: "No data found for the selected filters."

#### Scenario: CapEx and OpEx sub-routes still work

GIVEN a user navigates to `/app/reports/capex` or `/app/reports/opex`
WHEN the route resolves
THEN the respective preset page SHALL render with pre-filled filters
AND the Report Builder at `/app/reports` SHALL remain accessible separately
