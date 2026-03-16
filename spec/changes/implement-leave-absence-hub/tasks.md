# Implementation Tasks: implement-leave-absence-hub

1. Create OpenSpec delta for Leave hub requirements and scenarios.
2. Add leave hub filter model and pure filtering/mapping utilities for requests and timeline entries.
3. Build component-driven UI blocks for:
   - Collapsible filter panel
   - Absence timeline tab content
   - Reusable leave requests list section
4. Extend leave hooks with team requests query and typed leave status update mutation.
5. Rebuild `leave-page.tsx` around 3 tabs with shared filter state and RBAC-aware management actions.
6. Disable Team + Employee filter controls on "My Absences" tab.
7. Wire timeline tab to existing `LeaveTimeline` component with converted request/user data.
8. Run targeted frontend tests/lint for changed leave module and fix issues.
