# Proposal: update-control-sheet-streamlit-parity-rbac

## Why

Current `/app/control-sheet` is a simplified aggregated grid and does not match the legacy Streamlit control sheet workflow. Managers need weekly team oversight with explicit period statuses and per-employee drill-downs. The page also needs role-based team scoping: admins can access all teams, while PM/manager-level users can access only their assigned teams.

## What Changes

### Control Sheet UX parity with Streamlit
- Add a collapsible filter block with:
  - week selector (single date anchor, Monday-Sunday range)
  - team selector
- Split page into two sections:
  - Team Summary
  - Employee Summary

### Team Summary section
- Render weekly matrix with one row per employee and columns:
  - seven day columns (`dd` + 2-letter weekday)
  - total hours
  - period status
- Include employees with zero logged hours for the selected team scope.

### Employee Summary section
- Render one sheet/tab per employee in selected team scope.
- Employee sheet header shows:
  - employee full name
  - total week hours
  - status action button
- Status action button opens a compact dialog for changing status and adding a comment.
- Employee details table shows one row per task/worklog name and daily hours by weekday with total.

### RBAC team scoping
- `Admin`/`CEO`: all teams are available in team filter.
- `PM`/`Manager`: only teams from `/api/v1/org/my-teams` are available.
- Team data queries respect selected scope (`all` for admin/all-my-teams for PM).

## Impact

**Specs affected**: `spec/specs/pages` (delta)

**Files modified**:
- `web/src/routes/_app.control-sheet.tsx`
- `tests/e2e/control-sheet.spec.ts`

**Files created**:
- `spec/changes/update-control-sheet-streamlit-parity-rbac/proposal.md`
- `spec/changes/update-control-sheet-streamlit-parity-rbac/specs/pages/spec-delta.md`
- `spec/changes/update-control-sheet-streamlit-parity-rbac/tasks.md`

**APIs consumed**:
- `GET /api/v1/reports/dashboard`
- `GET /api/v1/approvals/team-periods`
- `GET /api/v1/org/my-teams`
- `GET /api/v1/org/units`
- `GET /api/v1/org/employees`
- `POST /api/v1/approvals/{period_id}/approve`
