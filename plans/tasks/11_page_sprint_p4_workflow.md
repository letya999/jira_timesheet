# Task 11: Page Sprint P4 — Workflow

**Goal:** Assemble Approvals, Control Sheet, and Leave Requests pages.

### Priority Order: P4 — Workflow

| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| Approvals | `/app/approvals` | `ApprovalCard` list, bulk actions | Manager role only |
| Control Sheet | `/app/control-sheet` | `TimesheetGrid` (aggregated, read-only) | Admin/Manager only |
| Leave Requests | `/app/leave` | `LeaveRequestCard` list, create form | All roles |

### Process per page (OpenSpec SDD cycle):
1. `openspec-proposal`: what data, which organisms, which hooks, which roles
2. Review: confirm all dependencies exist in phases 0-6
3. `openspec-implementation`: assemble
4. Playwright E2E test written for happy path
5. Streamlit equivalent page marked for deprecation

### Completion Criteria
- [ ] Approvals page assembled
- [ ] Control Sheet page assembled
- [ ] Leave Requests page assembled
- [ ] E2E tests pass
