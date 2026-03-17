# Implementation Tasks: UI Improvements, Localization Fixes, and Dark Mode Support

## Dashboard & Filters
1. [ ] Migrate `DashboardPage` filters to use a collapsible block with `FilterToggleButton` (matching `EmployeesPage` style).
2. [ ] Fix localization for "Project" and "Team" filters on `Dashboard` page.
3. [ ] Fix localization for "Project" and "Team" filters on `Journal` page.
4. [ ] Localize `journal.filter_search` and verify all other filters on `Journal` page are localized.
5. [ ] Update `JournalPage` filters to use the collapsible block style.

## Pagination & Layout
6. [ ] Fix "Страница 1 из 1" layout/overflow issue in `PaginationBar` for Russian locale.

## Dark Mode Support
7. [ ] Update `Sidebar` colors for dark mode.
8. [ ] Update `Tabs` component for better dark mode support (background/border).
9. [ ] Update `PivotTable` component for dark mode (sticky headers, borders, cell backgrounds).
10. [ ] Update `LeaveAbsenceCard` (Leave Request Card) for dark mode (replace hardcoded status colors with theme-aware classes).

## Localization & Page Specific Improvements
11. [ ] Localize "Columns" button on `EmployeesPage`.
12. [ ] Localize `OrgHierarchyWithMembers` (Org Tree) component.
13. [ ] Localize filters and `LeaveAbsenceCard` on `LeavePage`.
14. [ ] Update `LeavePage` filters to use the collapsible block style.
15. [ ] Localize "Access" tab on `SettingsPage`.

## Login Page
16. [ ] Add `LanguageSwitcher` and `ThemeSwitcher` to `LoginPage`.
17. [ ] Replace standard password `Input` with `PasswordInput` in `LoginPage`.

## Validation
18. [ ] Verify all changes in both Light and Dark modes.
19. [ ] Verify all changes in both English and Russian languages.
20. [ ] Run `npm run lint` and `npm run type-check` in the `web` directory.
