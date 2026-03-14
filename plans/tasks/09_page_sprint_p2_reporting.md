# Task 09: Page Sprint P2 — Reporting

**Goal:** Assemble CapEx and OpEx report pages.

### Priority Order: P2 — Reporting

| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| CapEx Report | `/app/reports/capex` | `DataTable`, `ReportSummaryCard`, `FilterBar` | Export to CSV/Excel |
| OpEx Report | `/app/reports/opex` | Same as CapEx | Different classification logic |

### Process per page (OpenSpec SDD cycle):
1. `openspec-proposal`: what data, which organisms, which hooks, which roles
2. Review: confirm all dependencies exist in phases 0-6
3. `openspec-implementation`: assemble
4. Playwright E2E test written for happy path
5. Streamlit equivalent page marked for deprecation

### Completion Criteria
- [ ] CapEx Report assembled with export
- [ ] OpEx Report assembled with export
- [ ] E2E tests pass
