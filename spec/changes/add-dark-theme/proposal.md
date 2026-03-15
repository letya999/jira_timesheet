# Proposal: Add Dark Theme to React Frontend

## Why

The application currently only supports a light theme, which can be straining for users in low-light environments. Modern enterprise applications are expected to provide a dark mode for better accessibility and user preference.

**Context**:
- The project is migrating to React 19 + Tailwind 4 + shadcn/ui.
- Tailwind 4 uses CSS variables for theming.
- `tokens.css` already contains partial `[data-theme="dark"]` definitions.

**Current state**: 
- Application is locked to light theme.
- No user-accessible way to switch themes.
- Dark mode CSS variables are incomplete.

**Desired state**: 
- Users can toggle between Light, Dark, and System theme.
- Theme preference is persisted in `localStorage`.
- All UI components correctly adapt to dark mode using CSS variables.
- Theme switcher is located in the User Menu (Topbar).

## What Changes

- **Core Theming**: Complete the dark mode color palette in `web/src/styles/tokens.css`.
- **State Management**: Implement a `ThemeProvider` and `useTheme` hook in `web/src/components/shared/theme-provider.tsx`.
- **UI Integration**: 
    - Add a `ThemeSwitcher` component.
    - Integrate the `ThemeSwitcher` into the `Topbar` dropdown menu.
- **Persistence**: Save the theme choice in `localStorage`.

## Impact

### Affected Specifications
- `spec/specs/ui-theming/spec.md` - New capability for UI theming and accessibility.

### Affected Code
- `web/src/styles/tokens.css` - CSS variable definitions.
- `web/src/layouts/components/topbar.tsx` - User menu integration.
- `web/src/components/shared/theme-provider.tsx` - New provider.

### User Impact
- Improved accessibility and visual comfort.
- Personalization of the workspace.

### API Changes
- None (Client-side only).

### Migration Required
- [ ] Database migration
- [ ] API version bump
- [ ] User communication needed
- [x] Documentation updates (Update UI guidelines)

## Timeline Estimate

Small (1-2 days).

## Risks

- **Color Contrast**: Some components might have insufficient contrast in dark mode.
    - *Mitigation*: Use Atlassian-inspired enterprise dark palette and verify with accessibility tools.
- **FOUC (Flash of Unstyled Content)**: Brief flash of light theme during initial load.
    - *Mitigation*: Inject a small blocking script in `index.html` to apply the theme before React hydration.
