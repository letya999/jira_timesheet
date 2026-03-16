# Proposal: implement-journal-streamlit-parity

## Why

The React Journal page currently renders a generic table with only date range filtering and does not match the legacy Streamlit Journal UX. Users rely on the Streamlit layout for rapid scanning: collapsible filter block, explicit date/project/team/category controls, date sort toggle, page-size slider, and vertically stacked worklog cards.

## What Changes

- Rework `web/src/routes/_app.journal.tsx` to match Streamlit Journal visual and interaction model.
- Keep data source as `GET /api/v1/timesheet` and map filters to backend query params.
- Preserve role behavior for team filtering (manager roles can choose teams; regular users remain scoped by backend policy).
- Replace table-first output with card list matching old structure (author+hours, issue line, project/category, logged at, work date).

## Scope

- In-scope: Journal filters UI, card list UI, server pagination integration, sort direction control, page size slider.
- Out-of-scope: My Timesheet, Dashboard, backend API changes.

## Impact

- Primary file: `web/src/routes/_app.journal.tsx`
- Supporting file: `web/src/features/timesheet/hooks/index.ts` (typed query params extension)
- Specs affected: `spec/changes/implement-journal-streamlit-parity/specs/pages/spec-delta.md`
