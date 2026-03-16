# Spec Delta - Leave Absence Hub

**Change**: `implement-leave-absence-hub`
**Target spec**: `spec/specs/leave/spec.md` (new capability)

## ADDED Requirements

### Requirement: Leave Page Tabbed Hub
WHEN an authenticated user opens `/app/leave`,
the system SHALL render three tabs: `Absence List`, `My Absences`, and `Manage Absences`.

#### Scenario: Tabs are visible and switch content
GIVEN a user is on `/app/leave`
WHEN the page loads
THEN all three tab triggers SHALL be visible
AND selecting each tab SHALL render the corresponding section content.

### Requirement: Shared Collapsible Filters
WHEN a user views `/app/leave`,
the system SHALL show a collapsible filter block above tabs with date range, team, employees, leave type, and leave status filters.

#### Scenario: My tab disables team and employee filters
GIVEN the active tab is `My Absences`
WHEN the filter block is shown
THEN Team and Employees controls SHALL be disabled
AND other filters SHALL remain available.

### Requirement: Absence Timeline View
WHEN the active tab is `Absence List`,
the system SHALL render a timeline/gantt-style component showing overlapping absences for multiple people.

#### Scenario: Timeline renders from filtered requests
GIVEN leave requests exist for several users
WHEN filters are applied
THEN timeline rows SHALL contain users with matching requests
AND bars SHALL represent request start/end dates and leave type.

### Requirement: Personal Leave Requests
WHEN the active tab is `My Absences`,
the system SHALL display leave requests created by the current user with their statuses.

#### Scenario: My requests list displays statuses
GIVEN the user has submitted leave requests
WHEN the tab is active
THEN cards SHALL display request period, type, and current status for each request.

### Requirement: Manager/Admin Leave Management
WHEN the active tab is `Manage Absences`,
manager/admin users SHALL be able to approve, reject, or cancel leave requests via status updates.

#### Scenario: Manager updates request status
GIVEN the user role is manager or admin
AND a pending request exists
WHEN the manager chooses Approve or Reject
THEN the system SHALL call the leave status update API
AND the request list SHALL refresh with updated status.

#### Scenario: Non-manager cannot manage
GIVEN the user role is not manager/admin
WHEN the user opens `Manage Absences`
THEN status action controls SHALL not be available
AND an informative message SHALL be shown.
