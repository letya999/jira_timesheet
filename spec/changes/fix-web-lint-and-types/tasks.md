# Implementation Tasks: Fix Web Quality (Linter & Types)

1. [ ] **Routing Fixes**: Correct module imports in `src/router.ts` for AI Chat, Leave, Notifications, and Settings routes.
2. [ ] **API Schemas (General)**: Standardize pagination parameters (`page`/`size` vs `skip`/`limit`) across `src/features/*/hooks/index.ts`.
3. [ ] **Feature-Specific API Fixes**:
    - [ ] Update `useTeamPeriods` and `usePeriods` hooks in `approvals/hooks/index.ts`.
    - [ ] Update `useOrgUnits`, `useEmployees`, and `assignUserRole` mutations in `org/hooks/index.ts`.
    - [ ] Update `useUsers` in `users/hooks/index.ts`.
4. [ ] **Type Safety - Leave Features**: Resolve "possibly undefined" errors in `src/components/leave/leave-timeline.tsx`.
5. [ ] **Type Safety - Approvals**: Fix incorrect property access (e.g., `periods.length`, `periods.map`) in `src/features/approvals/pages/approvals-page.tsx`.
6. [ ] **Type Safety - Control Sheet**: Fix `worklogs.reduce` issue on paginated response in `src/routes/_app.control-sheet.tsx`.
7. [ ] **Storybook Remediation**: Fix `rules-of-hooks` violations in Storybook story renderers (rename `render` to capitalized component names or use `StoryFn`).
8. [ ] **Linter Cleanup (Unused)**: Remove all unused imports and variables across the project (excluding `_` prefixed variables).
9. [ ] **Linter Cleanup (Fast Refresh)**: Separate components from other exports in files like `src/components/ui/*.tsx` and `src/routes/*.tsx`.
10. [ ] **Type Safety (Any)**: Replace `any` with specific types from `@/api/generated/types.gen.ts` or `unknown` in high-priority files (e.g., `ai-chat/hooks/index.ts`).
11. [ ] **Validation**: Run `cd web; bun run lint` and `cd web; bun x tsc --noEmit` to confirm zero errors and warnings.
