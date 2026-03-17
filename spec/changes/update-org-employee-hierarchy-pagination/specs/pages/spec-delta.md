## ADDED Requirements

### Requirement: Shared Org Hierarchy With Role Grouping
WHEN a page needs to display employees by organization units,
the system SHALL use a shared hierarchy component that renders the org tree and groups users by leadership roles and regular members.

#### Scenario: Leadership appears before members
GIVEN an org unit with users assigned to multiple roles
WHEN the unit is expanded in hierarchy view
THEN users with non-Employee roles SHALL be rendered in a leadership section first
AND each leadership entry SHALL display the assigned role name
AND regular members SHALL be rendered after leadership entries.

#### Scenario: Unassigned users are rendered separately
GIVEN users without assigned org units
WHEN hierarchy view is displayed
THEN the page SHALL render a dedicated unassigned users section below the org tree.

### Requirement: Shared Pagination Footer
WHEN a page presents server-paginated lists,
the system SHALL use a shared pagination footer component with consistent controls and summary text.

#### Scenario: Unified summary and controls
GIVEN a paginated list with page, page size, and total count
WHEN the pagination footer is rendered
THEN it SHALL display “Showing X-Y of Z ...” summary
AND it SHALL provide first/previous/next/last page controls
AND controls SHALL be disabled when navigation is not possible.

## MODIFIED Requirements

### Requirement: Employee Hierarchy View Layout
WHEN an Admin opens Employees page hierarchy view,
the system SHALL show the organization tree first and unassigned employees below it.

#### Scenario: Employees hierarchy includes org tree and unassigned section
GIVEN existing org units and users
WHEN the Admin opens the hierarchy tab on Employees page
THEN the organization hierarchy SHALL be visible at the top
AND a separate unassigned employees section SHALL be visible below the hierarchy.

### Requirement: Employee Filters Panel Interaction
WHEN a user clicks Show Filters,
the system SHALL expand the filters block immediately.

#### Scenario: Toggle filter visibility
GIVEN the employees list view
WHEN the user clicks Show Filters
THEN the filter panel SHALL expand
AND clicking Hide Filters SHALL collapse the panel.
