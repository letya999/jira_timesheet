# Implementation Tasks: Add Dark Theme

## Phase 1: Foundation (Theming)

1. [ ] Complete dark mode palette in `web/src/styles/tokens.css`.
2. [ ] Map semantic variables (`--background`, `--foreground`, etc.) for `[data-theme="dark"]`.

## Phase 2: Theme Management

3. [ ] Create `ThemeProvider` and `useTheme` hook in `web/src/components/shared/theme-provider.tsx`.
4. [ ] Implement `localStorage` persistence in `ThemeProvider`.
5. [ ] Wrap the application root with `ThemeProvider` in `web/src/main.tsx`.

## Phase 3: UI Integration

6. [ ] Add `ThemeSwitcher` component to `web/src/components/shared/theme-switcher.tsx`.
7. [ ] Integrate `ThemeSwitcher` into the `Topbar` dropdown menu in `web/src/layouts/components/topbar.tsx`.

## Phase 4: Optimization

8. [ ] Implement anti-FOUC script in `web/index.html`.
9. [ ] Audit key pages for accessibility and contrast in dark mode.

## Phase 5: Quality

10. [ ] Verify theme switching functionality and persistence.
11. [ ] Check `lucide-react` icons visibility in dark mode.
