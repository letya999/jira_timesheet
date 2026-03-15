# Spec Delta: implement-page-sprint-p4-workflow

## ADDED Requirements

### Requirement: Approvals Page Access
WHEN an authenticated user with "Manager" or "Admin" role navigates to `/app/approvals`,
the system SHALL display the list of pending team periods for approval.

#### Scenario: Manager views pending approvals
GIVEN a user with "Manager" role
WHEN they navigate to `/app/approvals`
THEN the system shows the list of pending team periods
AND allows them to approve or reject each period using `ApprovalCard`.

### Requirement: Control Sheet Aggregated View
WHEN an authenticated user with "Admin" or "Manager" role navigates to `/app/control-sheet`,
the system SHALL display an aggregated, read-only view of all team worklogs in a `TimesheetGrid`.

#### Scenario: Admin views aggregated worklogs
GIVEN a user with "Admin" role
WHEN they navigate to `/app/control-sheet`
THEN the system shows a grid with all worklogs for the selected period
AND defaults the date range to the current month.

### Requirement: Personal Leave Management
WHEN an authenticated user navigates to `/app/leave`,
the system SHALL display the status of their personal leave requests and allow creating new ones.

#### Scenario: User submits a leave request
GIVEN a user at `/app/leave`
WHEN they click "Request Leave" and submit the form
THEN the system creates a new leave request
AND adds it to the list of personal requests.

### Requirement: Workflow Role-Based Visibility
WHEN a user with "Employee" role tries to access `/app/approvals` or `/app/control-sheet`,
the system SHALL redirect them to the dashboard or show an "Access Denied" message.

#### Scenario: Employee tries to access manager-only route
GIVEN a user with "Employee" role
WHEN they attempt to navigate to `/app/approvals`
THEN the system denies access and redirects to the home route.
