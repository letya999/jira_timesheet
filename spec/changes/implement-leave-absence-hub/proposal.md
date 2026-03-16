# Proposal: implement-leave-absence-hub

## Why

Current `/app/leave` only shows the current user's requests and a create-request dialog. It does not support a shared absence overview, role-based leave management, or a consolidated filter experience. Product requirements now need a single absence hub with timeline visibility, personal request tracking, and manager/admin status actions.

## What Changes

- Replace `/app/leave` page layout with 3 tabs:
  - `Absence List` (shared timeline/gantt-style overview)
  - `My Absences` (current user's requests and statuses)
  - `Manage Absences` (approve/reject/cancel actions for manager/admin)
- Add a collapsible filter block above tabs with:
  - Date range
  - Team
  - Employees
  - Leave type
  - Leave status
- On `My Absences`, disable team and employee filters.
- Reuse existing `LeaveTimeline` component for the first tab and `LeaveRequestCard` for request cards.
- Add role-aware behavior:
  - Manager/admin can manage statuses on management tab.
  - Non-manager users can view tab but cannot perform actions.
- Extend leave data hooks to include team requests endpoint and stronger typed status updates.

## Impact

**Specs affected**: `spec/specs/leave/spec.md` (new capability reference)

**Frontend files**:
- `web/src/features/leave/pages/leave-page.tsx` (reworked page orchestration)
- `web/src/features/leave/hooks/index.ts` (new hook and typed mutation)
- `web/src/features/leave/components/*` (new component-driven leave hub parts)

**Behavioral impact**:
- `/app/leave` becomes a dashboard-style module with shared filters and role-aware management flow.
- Existing "create leave request" flow remains available.
