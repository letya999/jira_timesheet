# Proposal: Enhanced Employee Management

## Why
The current employee management page is basic and lacks critical features for enterprise resource management. Admins need more granular control over user roles, organizational unit assignments, and the ability to bridge the gap between imported Jira users and system users. The current interface doesn't support bulk actions, advanced filtering, or detailed user editing.

## What Changes
- **Unified List View**: Display all users (system and imported from Jira) in a single table.
- **User Type Classification**:
  - `system`: Users with application access (and potentially merged with Jira data).
  - `import`: Users only imported from Jira without application access.
- **Enhanced Data Display**: Add `Type` and `Email` columns.
- **Bulk Actions**: Add multi-select checkboxes and a bulk action menu (Set Role, Set Org Unit, Promote to System, Delete).
- **Advanced Filtering**: Add a collapsible filter panel (Org Unit, Type, Name search).
- **Detailed User Editing**:
  - Edit Name, Email, Org Unit, and System Role.
  - Multi-assignment to organizational units (e.g., Project Manager for multiple teams).
  - Password reset with a secure temporary password display.
  - Merge imported Jira users with existing system users.
  - Delete user and associated data.
- **RBAC Enforcement**: Ensure all management actions are strictly limited to the `Admin` role.
- **UX Improvements**: Add inline actions (three-dots menu) on hover and row selection feedback.

## Impact
- **Backend API**: New endpoints for bulk updates, user merging, and password resets. Existing user listing will be updated to include imported users and better type metadata.
- **Database**: Potentially minor schema updates to support multiple organizational unit assignments if not already present.
- **Frontend**: Significant redesign of the `EmployeesPage` and associated components.
- **API Client**: Regenerated to reflect backend changes.
- **Security**: Strict validation of Admin privileges for all new/modified endpoints.
