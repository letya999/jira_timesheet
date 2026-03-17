# Implementation Tasks: implement-project-manager-team-lead-rbac

1. [x] Add canonical role normalization helpers on frontend and backend.
2. [x] Apply manager/admin route guards for `/app/dashboard`, `/app/journal`, `/app/projects`, `/app/reports`, `/app/approvals`.
3. [x] Remove `/app/hr` from active router and sidebar navigation.
4. [x] Update sidebar visibility rules: employees do not see manager/admin pages.
5. [x] Scope dashboard team filter options to manager-owned teams (admins keep all teams).
6. [x] Scope journal team filter options to manager-owned teams (admins keep all teams).
7. [x] Enforce backend team scoping for manager role in worklog listing endpoint (`/api/v1/timesheet`).
8. [x] Make `/app/my-timesheet` read-only and current-week-only in UI.
9. [x] Keep `/app/employees` readable for non-admin users but remove action controls for non-admins.
10. [x] Restrict project API endpoints to manager/admin roles.
11. [x] Restrict leave-management data scope for non-admin managers to their teams.
12. [x] Update org hierarchy widget: highlight manager leadership cards and hide admin users.
13. [x] Limit Settings tabs for non-admin users to Profile and Notifications.
14. [x] Add admin-only Settings `Access` tab with RBAC matrix view.
15. [ ] Run lint/tests and fix any regressions.