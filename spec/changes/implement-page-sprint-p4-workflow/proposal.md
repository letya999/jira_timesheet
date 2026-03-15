# Proposal: implement-page-sprint-p4-workflow

## Why

The Sprint P4 focus is on "Workflow" pages — Approvals, Control Sheet, and Leave Requests. Currently, these routes (`/app/approvals`, `/app/control-sheet`, `/app/leave`) exist only as Phase 6 placeholder stubs. This change assembles the final UI using previously built organisms and hooks, enabling managers to approve time, admins to view aggregated sheets, and all users to manage leave requests.

## What Changes

### Approvals Page (`/app/approvals`)
- Replace stub with a manager-only approval dashboard.
- Features:
  - List of team periods pending approval using `ApprovalCard`.
  - Bulk actions (Approve All, Reject All).
  - Wired to `useTeamPeriods` and `useApprovePeriod` / `useRejectPeriod` hooks.
- Role Access: Manager or Admin only (enforced via `Guard` component already in layout).

### Control Sheet Page (`/app/control-sheet`)
- Replace stub with an aggregated, read-only view of all team worklogs.
- Features:
  - `TimesheetGrid` in read-only mode showing aggregated data across users/projects.
  - Date range filtering (defaults to current month).
  - Wired to `useAllTimesheetEntries` (already exists in `timesheet` features).
- Role Access: Admin or Manager only.

### Leave Requests Page (`/app/leave`)
- Replace stub with a personal leave management page.
- Features:
  - `LeaveRequestCard` list showing status of personal requests.
  - "Request Leave" button opening a dialog with a creation form.
  - Wired to `useMyLeaveRequests` and `useCreateLeaveRequest`.
- Role Access: All authenticated users.

## Impact

**Specs affected**: `spec/specs/pages/` (extending)

**Files modified**:
- `web/src/routes/_app.approvals.tsx`
- `web/src/routes/_app.control-sheet.tsx`
- `web/src/routes/_app.leave.tsx`

**Files created**:
- `tests/e2e/approvals.spec.ts`
- `tests/e2e/control-sheet.spec.ts`
- `tests/e2e/leave.spec.ts`

**APIs consumed**:
- `GET /api/v1/approvals/team-periods`
- `POST /api/v1/approvals/approve`
- `POST /api/v1/approvals/reject`
- `GET /api/v1/timesheet` (all entries)
- `GET /api/v1/leaves/my`
- `POST /api/v1/leaves`

**Dependencies confirmed**:
- `ApprovalCard` — `web/src/components/organisms/approval-card.tsx` (found via stories, need to verify implementation)
- `TimesheetGrid` — `web/src/components/organisms/timesheet-grid.tsx`
- `LeaveRequestCard` — `web/src/components/organisms/leave-request-card.tsx`
- `useTeamPeriods` — `web/src/features/approvals/hooks/index.ts`
- `useMyLeaveRequests` — `web/src/features/leave/hooks/index.ts`

**Streamlit deprecation**: Streamlit equivalents for `/approvals`, `/control-sheet`, and `/leave` are deprecated.
