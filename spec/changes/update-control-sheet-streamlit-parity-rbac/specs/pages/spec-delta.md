# Spec Delta: update-control-sheet-streamlit-parity-rbac

## ADDED Requirements

### Requirement: Control Sheet has collapsible weekly filters
WHEN an authenticated manager/admin opens `/app/control-sheet`,
THEN the system SHALL show a collapsible filter block with week and team selectors.

#### Scenario: Week filter defines a Monday-Sunday window
GIVEN a user selects any date in the week filter
WHEN filters are applied
THEN the system SHALL compute and use that week's Monday as start date and Sunday as end date for data queries.

#### Scenario: Team options are role-scoped
GIVEN a user with role `Admin` or `CEO`
WHEN team filter loads
THEN all teams SHALL be available.

GIVEN a user with role `PM` or `Manager`
WHEN team filter loads
THEN only teams assigned to that user SHALL be available.

### Requirement: Control Sheet shows Team Summary and Employee Summary
WHEN control-sheet data is loaded
THEN the page SHALL render two sections: Team Summary and Employee Summary.

#### Scenario: Team summary matrix
GIVEN a selected week and team scope
WHEN Team Summary renders
THEN rows SHALL represent employees in scope
AND columns SHALL include seven weekday columns (2-letter weekday + day number), total hours, and period status.

#### Scenario: Employee summary per employee
GIVEN a selected week and team scope
WHEN Employee Summary renders
THEN the page SHALL provide one employee sheet/tab per employee
AND each sheet SHALL show employee header (name, week total, status action)
AND a task-by-day hours table with total per task.

### Requirement: Status can be updated from employee sheet dialog
WHEN a user clicks status action in an employee sheet header
THEN the system SHALL open a compact dialog to select target status and optional comment.

#### Scenario: Apply status update
GIVEN a timesheet period exists for that employee/week
WHEN user submits the status dialog
THEN the system SHALL call approval API and refresh statuses in the current control-sheet view.
