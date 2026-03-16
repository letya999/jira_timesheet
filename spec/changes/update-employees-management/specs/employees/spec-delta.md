# Specification Delta: Employees Management

## MODIFIED Requirements

### Requirement: Employee Listing
WHEN an Admin accesses the Employees page,
the system SHALL display a unified list of all users, including those with application access and those imported only from Jira.

#### Scenario: Unified User List with Type Information
GIVEN a set of system users and imported Jira users
WHEN the Admin views the employee list
THEN each row SHALL display the user's name, email, and type (System/Import)
AND the System type SHALL represent users with application access
AND the Import type SHALL represent users without application access.

### Requirement: Employee Actions (Admin)
WHEN an Admin hovers over a user row or selects a user,
the system SHALL provide options to edit, merge, reset password, or delete.

#### Scenario: Inline Actions
GIVEN the employee list
WHEN the Admin hovers over a row
THEN an inline actions menu SHALL be visible.

#### Scenario: Row Selection and Bulk Actions
GIVEN the employee list
WHEN the Admin selects one or more rows via checkboxes
THEN a bulk action bar SHALL appear above the table
AND the Admin can perform actions on all selected users simultaneously.

### Requirement: User Merging
WHEN an Admin initiates a merge between an imported Jira user and an existing system user,
the system SHALL consolidate their data into the system user record and remove the redundant imported user record.

#### Scenario: Successful Merge
GIVEN an imported Jira user "Jira_User" and a system user "System_User"
WHEN the Admin chooses to merge "Jira_User" into "System_User"
THEN the system user record SHALL inherit Jira-specific data (e.g., Jira Account ID) from the Jira user
AND the Jira user record SHALL be removed from the database.

### Requirement: Password Reset (Admin)
WHEN an Admin resets a system user's password,
the system SHALL generate a secure temporary password and display it for immediate use.

#### Scenario: Password Reset Display
GIVEN a system user
WHEN the Admin clicks "Reset Password"
THEN the system creates a new temporary password
AND displays it in a secure dialog with "Copy" and "Cancel" buttons.

### Requirement: User Filtering
WHEN an Admin applies filters to the employee list,
the system SHALL dynamically update the results based on organizational unit, user type, and name search.

#### Scenario: Filtering by Multiple Criteria
GIVEN a list of employees
WHEN the Admin selects a specific organizational unit and the "System" user type
THEN the list SHALL only show users who match both criteria.
