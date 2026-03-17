## Why
- Employee hierarchy view is incomplete and does not surface non-Employee leadership roles per org unit.
- The same hierarchy behavior is needed in both Employees and Org pages to avoid diverging UX and logic.
- Pagination controls are inconsistent across pages (Employees, Projects, Journal).
- The new shared filter toggle button broke Collapsible trigger behavior because trigger props/ref are not forwarded.

## What Changes
- Fix shared `FilterToggleButton` to correctly work with Radix `CollapsibleTrigger asChild`.
- Add a shared org hierarchy-with-members component that renders org tree, leadership section, members section, and unassigned users section.
- Reuse the same hierarchy component on `/app/employees` and `/app/org`.
- Add `role` column to Employees list and keep it controllable via Columns toggle.
- Add and apply a shared paginated footer component with unified behavior and labels (showing range, first/prev/next/last).

## Impact
- Affected specs: `pages`
- Affected frontend areas: employees page, org page, projects page pagination, journal page pagination, shared UI components.
- API usage impact: additional org unit role queries to render leadership grouping.
