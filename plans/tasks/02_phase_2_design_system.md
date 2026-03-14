# Task 02: Phase 2 — Design System (Tokens + Atoms)

**Goal:** Complete atom library in Storybook. Every atom has Controls panel with all visual states.

### 2a — Tokens
- CSS custom properties in `src/styles/tokens.css`
- Color palette: primary, neutral, success, warning, error, info (light + dark variants)
- Typography scale: font-family, size scale, line-height, font-weight
- Spacing, border-radius, shadow, z-index scales
- Dark mode via `[data-theme="dark"]` on `<html>` (Tailwind 4 native)

### 2b — Atoms (each = component + story + unit test)

| Component | CVA Variants |
|---|---|
| `Button` | variant (primary/secondary/ghost/destructive), size (sm/md/lg), loading, disabled |
| `Input` | size, state (default/error/success), leading icon, trailing icon |
| `Textarea` | size, state |
| `Select` | size, state, clearable |
| `MultiSelect` | size, state, search |
| `Checkbox` | checked, indeterminate, disabled |
| `Switch` | checked, disabled |
| `Radio` / `RadioGroup` | disabled |
| `Badge` | variant (default/secondary/outline) |
| `StatusBadge` | status (active/syncing/error/warning/archived/pending) — used for Jira sync states |
| `Avatar` | size (sm/md/lg), fallback (initials from name), online indicator |
| `Skeleton` | shape (line/circle/rect), animated |
| `Spinner` | size, color |
| `Tooltip` | placement, delay |
| `Alert` | variant (info/success/warning/error), dismissible |
| `Separator` | orientation |
| `LanguageSwitcher` | compact/full |

### Rules
- Atoms have zero business logic and zero API knowledge
- `StatusBadge` accepts `status: "active" | "synced" | "error"` — not raw Jira strings
- All atoms pass a11y checks in Storybook

### Completion Criteria
- [ ] All atoms rendered in Storybook
- [ ] All states visible via Controls panel
- [ ] `bun test` passes for all atom unit tests
- [ ] No a11y violations in Storybook
