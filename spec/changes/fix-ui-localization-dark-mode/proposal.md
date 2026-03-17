# Proposal: UI Improvements, Localization Fixes, and Dark Mode Support

## Why
Multiple UI components across the application have inconsistent behavior, missing localization, or lack proper support for dark mode. This affects user experience, especially for non-English speakers and users who prefer dark mode.

## What Changes
1.  **Dashboard Filters**:
    *   Migrate `Dashboard filters` to a collapsible block similar to the `Employees` page.
    *   Fix localization for "Project" and "Team" filters (ensure `journal.all_projects`, `journal.all_teams`, and `common.project`/`common.team` are used correctly).
2.  **Pagination Layout**:
    *   Fix "Страница 1 из 1" layout shift/overflow in Russian locale.
3.  **Dark Mode Support**:
    *   Fix `Sidebar` component dark mode colors.
    *   Fix `Tabs` component dark mode support.
    *   Fix `PivotTable` component dark mode support.
    *   Fix `LeaveRequestCard` (LeaveAbsenceCard) dark mode support.
4.  **Localization**:
    *   `Journal` page: Localize "Team" and "Project" filters, and `journal.filter_search`.
    *   `Org` page: Finish localization for `OrgTree` (OrgHierarchyWithMembers) component.
    *   `Employees` page: Localize the "Columns" button.
    *   `Leave` page: Localize all filters and `LeaveRequestCard`.
    *   `Settings` page: Localize the "Access" tab.
5.  **Login Page**:
    *   Add language and theme switchers.
    *   Replace `Input type="password"` with `PasswordInput` to add show/hide functionality.

## Impact
*   **User Experience**: Improved consistency, accessibility, and visual polish.
*   **Localization**: Better support for Russian and English users.
*   **Theming**: Full dark mode support for core components.
