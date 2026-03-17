# Spec Delta: implement-project-manager-team-lead-rbac

## MODIFIED Requirements

### Requirement: Manager-scoped analytics and approvals pages
WHEN an authenticated user opens `/app/dashboard`, `/app/journal`, `/app/projects`, `/app/reports`, or `/app/approvals`
THEN access SHALL be granted only for manager/admin roles.

#### Scenario: Employee opens manager-only route
GIVEN a user with role `Employee`
WHEN they navigate directly to `/app/dashboard`
THEN the router SHALL redirect them to `/app/my-timesheet`.

#### Scenario: Manager team filters are scoped
GIVEN a user with role `Project Manager` or `Team Lead`
WHEN dashboard or journal Team filter options are loaded
THEN only teams assigned to that manager SHALL be shown
AND data requests SHALL be limited to those teams.

### Requirement: My Timesheet is personal read-only weekly view
WHEN any authenticated user opens `/app/my-timesheet`
THEN only the current week personal worklogs SHALL be shown
AND editing/creation controls SHALL not be available.

### Requirement: Employees page supports read-only non-admin mode
WHEN a non-admin opens `/app/employees`
THEN they SHALL be able to search/filter/view users
AND mutation actions (sync/edit/promote/delete/bulk actions) SHALL not be available.

### Requirement: Leave page tab visibility and scope
WHEN any authenticated user opens `/app/leave`
THEN `Leave overview` and `My leaves` SHALL be available.

#### Scenario: Management tab visibility
GIVEN role `Employee`
WHEN tabs are rendered
THEN `Leave management` SHALL not be shown.

GIVEN role `Project Manager` or `Team Lead` or `Admin`
WHEN tabs are rendered
THEN `Leave management` SHALL be shown.

#### Scenario: Management filter team scope
GIVEN role `Project Manager` or `Team Lead`
WHEN `Leave management` filters are rendered
THEN Team filter SHALL include only manager-assigned teams.

GIVEN role `Admin`
WHEN `Leave management` filters are rendered
THEN Team filter SHALL include all teams.

### Requirement: Settings tabs by role
WHEN a non-admin opens `/app/settings`
THEN only `Profile` and `Notifications` tabs SHALL be visible.

WHEN an admin opens `/app/settings`
THEN admin tabs (`Org`, `Jira integration`, `Admin settings`, `Access`) SHALL be visible.

#### Scenario: Access tab
GIVEN an admin on `/app/settings`
WHEN opening `Access` tab
THEN a role-to-page RBAC matrix SHALL be displayed.

### Requirement: HR route removal
WHEN navigating app routes
THEN `/app/hr` SHALL not be part of active application routing/navigation.