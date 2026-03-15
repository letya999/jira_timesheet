# Task 10: Page Sprint P3 — Management

**Goal:** Assemble Employees, Org Structure, and Projects pages.

### Priority Order: P3 — Management

| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| Employees | `/app/employees` | `DataTable`, `EmployeeCard` (preview panel) | Filter by dept/role |
| Org Structure | `/app/org` | `OrgTreeNode` (recursive) | Expand/collapse hierarchy |
| Projects | `/app/projects` | `DataTable`, `ProjectRow`, `GanttWrapper` | Gantt on detail view |

### Process per page (OpenSpec SDD cycle):
1. `openspec-proposal`: what data, which organisms, which hooks, which roles
2. Review: confirm all dependencies exist in phases 0-6
3. `openspec-implementation`: assemble
4. Playwright E2E test written for happy path
5. Streamlit equivalent page marked for deprecation

### Completion Criteria
- [ ] Employees page assembled
- [ ] Org Structure page assembled
- [ ] Projects page assembled
- [ ] E2E tests pass
