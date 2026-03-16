# Spec Delta — Report Builder Collapsible + Pivot Table Output

**Change**: `update-report-builder-collapsible-pivot`
**Target spec**: `spec/specs/pages/spec.md`

## MODIFIED Requirements

### Requirement: Report Builder Page

WHEN an authenticated user with `reports.view` permission opens `/app/reports`,
the system SHALL provide collapsible configuration sections and render report results as a pivot table based only on selected dimensions.

#### Scenario: Filters and pivot sections are collapsible
GIVEN the Report Builder page is loaded
WHEN the page renders
THEN `Data filters` SHALL be displayed in a collapsible block
AND `Pivot configuration` SHALL be displayed in a collapsible block
AND both blocks SHALL support expand/collapse behavior without losing filter state.

#### Scenario: Aggregated metrics are collapsible
GIVEN report data is loaded
WHEN results section is rendered
THEN aggregated metrics cards SHALL be wrapped in a collapsible block
AND metrics values SHALL remain unchanged when collapsing/expanding the block.

#### Scenario: Pivot table includes only selected dimensions
GIVEN report data is loaded
WHEN the table is rendered
THEN left-side row headers SHALL contain only selected `Row dimensions` in selected order
AND data columns SHALL be created only from selected `Column dimensions`
AND fields not selected in rows/columns SHALL NOT be shown.

#### Scenario: Nested grouped column headers
GIVEN more than one `Column dimension` is selected
WHEN the table header is rendered
THEN header rows SHALL represent nested grouping levels by selected column dimension order
AND each nested header SHALL group child columns accordingly.

#### Scenario: Horizontal grouping single selector
GIVEN the user opens Pivot configuration
WHEN controls are displayed
THEN a `Group horizontally by` single-select control SHALL be available
AND selecting a value SHALL apply additional horizontal grouping in table output.

#### Scenario: Sticky header and viewport-fit in table focus
GIVEN the data table is visible
WHEN the table container receives focus
THEN table header rows SHALL remain sticky during vertical scroll
AND table viewport height SHALL expand to fit available screen space.

#### Scenario: Sprint values are populated in report rows
GIVEN worklogs are linked to issue sprints
WHEN custom report data is requested
THEN sprint values in response rows SHALL include sprint names instead of always being empty.
