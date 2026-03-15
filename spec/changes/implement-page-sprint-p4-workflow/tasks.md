# Implementation Tasks: implement-page-sprint-p4-workflow

## Preparation
1. [x] Verify `ApprovalCard`, `TimesheetGrid`, and `LeaveRequestCard` implementations are complete and wired to hooks.

## Approvals Page
2. [x] Replace stub in `web/src/routes/_app.approvals.tsx` with `ApprovalCard` list and layout.
3. [x] Implement `Bulk Actions` (Approve All, Reject All) in Approvals view.
4. [x] Wire to `useTeamPeriods`, `useApprovePeriod`, and `useRejectPeriod` hooks.

## Control Sheet Page
5. [x] Replace stub in `web/src/routes/_app.control-sheet.tsx` with `TimesheetGrid` (read-only, aggregated view).
6. [x] Implement date range filtering (defaults to current month).
7. [x] Wire to `useAllTimesheetEntries` (already existing in `timesheet` feature).

## Leave Requests Page
8. [x] Replace stub in `web/src/routes/_app.leave.tsx` with `LeaveRequestCard` list and request button.
9. [x] Implement "Request Leave" dialog using a new or existing form component.
10. [x] Wire to `useMyLeaveRequests` and `useCreateLeaveRequest` hooks.

## Verification
11. [x] Write and run Playwright E2E tests for `Approvals` happy path.
12. [x] Write and run Playwright E2E tests for `Control Sheet` happy path.
13. [x] Write and run Playwright E2E tests for `Leave Requests` happy path.
14. [ ] Verify responsive behavior on mobile/tablet views for all three pages.
