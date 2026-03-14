# Task 14: Cross-Cutting Concerns

**Goal:** Ensure performance, accessibility, timezone handling, and monitoring.

### Performance
- All routes lazy-loaded (`React.lazy` + `Suspense`)
- `@tanstack/react-virtual` for any list > 100 items
- `DataTable` virtualized by default
- Images: WebP, lazy loading via `loading="lazy"`
- Bundle target: < 200kb initial JS (gzipped)

### Accessibility
- All atoms use Radix UI primitives (keyboard nav, ARIA built-in)
- `@storybook/addon-a11y` enforced in CI — story a11y violations block merge
- Focus management on modals and dialogs
- Color contrast meets WCAG 2.1 AA

### Timezone Handling
- All timestamps stored as UTC in backend
- `date-fns-tz` used everywhere for display — always convert to user's local timezone
- `useTimezone()` hook: reads from user profile settings, falls back to browser timezone
- Never use `new Date()` directly — always through lib wrapper

### Error Monitoring
- Sentry (or equivalent) initialized in `main.tsx`
- React ErrorBoundary at layout level
- Unhandled promise rejections captured
- User context attached to Sentry events (userId, role)

### CI/CD Integration
- On push to any branch: `bun run lint` + `bun run typecheck` + `bun test`
- On push to `dev`: Storybook build + Chromatic visual regression (or self-hosted)
- On push to `main`: full build + Playwright E2E + Docker image build
- Docker: `web/Dockerfile` with multi-stage build (bun build → nginx static)
- Caddy config updated to serve React build at primary route
