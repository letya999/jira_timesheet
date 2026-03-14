# Task 05: Phase 5 — Routing & Layout

**Goal:** Navigation works, layouts assembled, route protection in place.

### Route Tree
```
/login                    → AuthLayout
/app                      → AppLayout (sidebar + topbar)
  /app/dashboard
  /app/journal
  /app/my-timesheet
  /app/org
  /app/employees
  /app/employees/$id
  /app/projects
  /app/projects/$id
  /app/reports
    /app/reports/capex
    /app/reports/opex
  /app/approvals
  /app/control-sheet
  /app/leave
  /app/notifications
  /app/settings
  /app/hr                 → Admin/HR only
  /app/ai-chat            → if AI module enabled
```

### Layouts
- `AuthLayout`: centered card, logo, no sidebar
- `AppLayout`: responsive sidebar (collapsible on mobile), topbar with user menu + lang switcher + notification bell
- Sidebar nav items filtered by user permissions

### Route Loaders
Each route loader prefetches its primary data using `queryClient.ensureQueryData()`.
Pending UI shown during loader execution (TanStack Router built-in).

### Completion Criteria
- [ ] All routes render without errors
- [ ] Sidebar navigation works
- [ ] Route loaders prefetch data
- [ ] 404 and error routes configured
