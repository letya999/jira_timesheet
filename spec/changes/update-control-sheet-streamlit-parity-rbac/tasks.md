# Implementation Tasks: update-control-sheet-streamlit-parity-rbac

## OpenSpec artifacts
1. [x] Create proposal for control-sheet Streamlit parity and RBAC team scope.
2. [x] Add spec delta for filters, two sections, matrices, and status dialog.

## Frontend implementation
3. [x] Replace existing `/app/control-sheet` route component with:
   - collapsible week/team filters
   - Team Summary section
   - Employee Summary section.
4. [x] Implement role-scoped team loading (`all teams` for Admin/CEO, `my teams` for PM/Manager).
5. [x] Build team summary matrix: weekday columns + total + status.
6. [x] Build employee summary sheets: header + task/day matrix.
7. [x] Add status change dialog with comment and approval API mutation.

## Verification
8. [x] Update and run Playwright control-sheet test for new layout and interactions.
9. [x] Run web lint for modified files.
