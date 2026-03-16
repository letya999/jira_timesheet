# Implementation Tasks: Enhanced Employee Management

## Phase 1: Backend (Data Layer & API)
1. [ ] Update User models/schemas to support unified listing (System + Jira users).
2. [ ] Add `UserType` enum (system, import) to backend logic.
3. [ ] Implement `GET /api/users/all` with filtering by Type, Org Unit, and Search.
4. [ ] Implement `POST /api/users/bulk-update` (Role, Org Units).
5. [ ] Implement `POST /api/users/promote-bulk` (Promote many Jira users).
6. [ ] Implement `POST /api/users/reset-password` (Generate temp password).
7. [ ] Implement `POST /api/users/merge` (Merge Jira user into system user).
8. [ ] Implement `DELETE /api/users/{user_id}` (Delete system or import user).
9. [ ] Ensure all management endpoints are strictly `Admin` only.
10. [ ] Regenerate frontend API client (`npm run generate-client`).

## Phase 2: Frontend (UI Components)
11. [ ] Create `EmployeeFilterPanel` collapsible component.
12. [ ] Update `getEmployeeColumns` to include checkboxes, type badge, and actions menu.
13. [ ] Create `UserEditDialog` with support for:
    - Base info (Name, Email)
    - Org Unit (Select with search)
    - Role (Select)
    - Multiple Org Unit assignments (Project/Team Lead roles)
14. [ ] Create `PasswordResetDialog` for temporary password display.
15. [ ] Create `MergeUserDialog` for searching and merging users.
16. [ ] Implement bulk action bar above the table.

## Phase 3: Integration & Testing
17. [ ] Integrate new API endpoints into `useEmployees` and `useUserActions` hooks.
18. [ ] Update `EmployeesPage` to use the new layout and components.
19. [ ] Add backend tests for new endpoints (especially RBAC and bulk actions).
20. [ ] Add frontend tests for filters and row selection.
