# Proposal: implement-project-manager-team-lead-rbac

## Why
Current RBAC behavior is inconsistent across pages and endpoints:
- `Project Manager` / `Team Lead` are not treated uniformly as manager roles.
- Team-scoped pages (`dashboard`, `journal`, `leave management`) can show broader filters/data than allowed.
- Employees can still see or open pages that should be manager/admin-only.
- Settings do not expose a clear RBAC access matrix for administrators.
- Org tree leadership display does not explicitly enforce manager-only leadership cards and admin hiding.

## What Changes
### Role normalization and RBAC foundation
- Add canonical role mapping for both frontend and backend:
  - `Admin`, `CEO` -> admin
  - `PM`, `Manager`, `Project Manager`, `Team Lead` -> manager
  - `Employee` -> employee
- Apply canonical checks in route guards, menu visibility, and backend access filtering.

### Org unit leadership model and org tree UX
- Keep org-unit role assignment model supporting `Employee`, `Project Manager`, `Team Lead`.
- Update org hierarchy widget behavior:
  - show leadership cards directly under expanded unit header,
  - highlight leaders,
  - do not show admins in org hierarchy leadership/member blocks.

### Page access and scope
- Manager/admin-only pages: `/app/dashboard`, `/app/journal`, `/app/projects`, `/app/reports`, `/app/approvals`.
- Remove `/app/hr` from active routing/navigation.
- `/app/employees` remains visible to all authenticated users, but non-admin users are read-only (search/filter/view only).
- `/app/my-timesheet` becomes read-only current-week-only view for all users.
- `/app/leave` available to all:
  - `Leave management` tab visible only to manager/admin roles,
  - for non-admin managers, team filter options in `Leave management` are scoped to their teams,
  - `Leave overview` keeps all filters available to all users.
- `/app/settings`:
  - non-admin: only `Profile` and `Notifications` tabs,
  - admin-only tabs: `Org`, `Jira integration`, `Admin settings`, new `Access` tab.

### Settings Access tab
- Add admin-only Access tab that renders an RBAC matrix describing role-to-page visibility per current rules.

## Impact
- Enforces strict team scoping for manager roles on dashboard/journal/leave-management flows.
- Prevents employee access to manager/admin pages both in navigation and by direct route access.
- Preserves full superuser access for admins while excluding admin from org leadership display.
- Improves RBAC transparency via admin-only access matrix.