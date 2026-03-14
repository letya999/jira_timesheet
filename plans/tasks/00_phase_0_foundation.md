# Task 00: Phase 0 — Foundation

**Goal:** `bun dev` + `bun storybook` + `bun test` all work. CI passes.

### Tooling
- `web/` directory at project root (alongside `backend/`)
- Bun 1.3.x as package manager and runtime
- Vite 8 (Rolldown-based) as build tool
- TypeScript 6 in strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- ESLint 10 + Prettier + Husky pre-commit hook
- `.env.development` / `.env.production` for API base URL config

### Testing Infrastructure
- Vitest 3 (unit + component logic)
- Storybook 10 with `@storybook/experimental-addon-test` (Vitest integration)
- `@storybook/addon-a11y` (accessibility checks in every story)
- Playwright (E2E skeleton — real tests written per page in Page Sprint)
- MSW 2 global setup in `src/mocks/` — handlers per domain

### Styling
- Tailwind 4 via `@import "tailwindcss"` (no tailwind.config.js)
- shadcn/ui CLI initialized with custom tokens
- `src/styles/tokens.css` with CSS custom properties

### Project Structure
```
web/
  src/
    api/           # generated types + client
    assets/
    components/    # atoms and molecules (shared, domain-agnostic)
    features/      # domain-grouped: auth, timesheet, reports, org, ...
      {domain}/
        components/  # organisms specific to this domain
        hooks/
        schemas/
        stories/
    layouts/       # AppLayout, AuthLayout
    lib/           # utils, date helpers, formatters
    mocks/         # MSW handlers
    routes/        # TanStack Router file-based routes
    stores/        # Zustand stores
    styles/
    test/          # test utilities, render helpers
```

### i18n Setup (do in Phase 0, not later)
- `react-i18next` + `i18next`
- `src/i18n/` with `en.json` / `ru.json` (mirror existing `frontend/i18n.py` keys)
- `useTranslation()` hook used from the first component
- Language switcher component built in Phase 2

### Completion Criteria
- [ ] `bun dev` opens Hello World on localhost
- [ ] `bun storybook` starts without errors
- [ ] `bun test` runs and passes
- [ ] `bun run lint` passes
- [ ] CI pipeline runs on push (GitHub Actions or equivalent)
