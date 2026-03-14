# Task 12: Page Sprint P5 — Supporting

**Goal:** Assemble Notifications, Settings, and HR Module pages.

### Priority Order: P5 — Supporting

| Page | Route | Key Organisms | Notes |
|---|---|---|---|
| Notifications | `/app/notifications` | `NotificationItem` list | Real-time badge count |
| Settings | `/app/settings` | Tabs: profile, org, Jira integration, notifications | Admin tabs gated |
| HR Module | `/app/hr` | `DataTable`, management forms | HR/Admin only |

### Process per page (OpenSpec SDD cycle):
1. `openspec-proposal`: what data, which organisms, which hooks, which roles
2. Review: confirm all dependencies exist in phases 0-6
3. `openspec-implementation`: assemble
4. Playwright E2E test written for happy path
5. Streamlit equivalent page marked for deprecation

### Completion Criteria
- [ ] Notifications page assembled
- [ ] Settings page assembled
- [ ] HR Module page assembled
- [ ] E2E tests pass
