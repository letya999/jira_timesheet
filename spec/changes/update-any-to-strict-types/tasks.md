# Implementation Tasks: Update 'any' to Strict Types

1. [ ] Identify and replace `any` in `web/src/features/ai-chat/hooks/index.ts` using generated SDK types.
2. [ ] Audit `web/src/features/timesheet/hooks/index.ts` for hidden `any` usages or implicit types.
3. [ ] Replace `any` in `web/src/features/org/components/unit-form.tsx` and similar forms with `unknown` or specific interfaces.
4. [ ] Audit `web/src/features/org/components/unit-role-assignments.tsx` for `any` in list mappings.
5. [ ] Replace `any` in `web/src/features/leave/hooks/index.ts` (specifically `status: any`).
6. [ ] Update test files (e.g., `web/src/features/reports/pages/report-builder-page.test.tsx`) to use better typing or `unknown`.
7. [ ] Verify all changes by running `npm run type-check` or equivalent.
8. [ ] Perform a final sweep for `: any` and `(any)` in `web/src` using `grep_search`.
