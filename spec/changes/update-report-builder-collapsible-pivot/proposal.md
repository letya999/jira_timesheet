# Proposal: update-report-builder-collapsible-pivot

## Why

The Report Builder page at `/app/reports` still differs from the required UX and table behavior:
- Filter and pivot sections are static cards instead of collapsible blocks.
- Aggregated statistics cards are always expanded.
- Data table currently shows raw fields (including non-selected columns like `issue_key`) instead of pivoted dimensions.
- Column dimension hierarchy is not rendered as grouped nested headers.
- Selected dimension order is not preserved in table output.
- There is no dedicated one-field horizontal grouping control.
- Sprint values are reported as empty in user workflows.

These gaps block parity with the expected interaction model shown in the reference screenshot and Streamlit behavior.

## What Changes

- Add collapsible blocks for:
  - Data filters
  - Pivot configuration
  - Aggregated metrics section
- Implement focus mode for data table:
  - sticky headers
  - viewport-fit height when table container is focused
- Replace flat data-table rendering with pivot-table rendering in frontend:
  - row headers are only selected `Row dimensions`
  - nested grouped column headers follow selected `Column dimensions`
  - preserve dimension selection order
  - hide fields not selected in row/column dimensions
- Add new pivot control: `Group horizontally by` (single field).
- Apply `Group horizontally by` to column grouping hierarchy in pivot output.
- Fix sprint values in custom report payload output by making sprint serialization robust for different relation loading shapes.
- Update/extend tests for pivot config and report table behavior.

## Impact

- **Frontend UI**:
  - `web/src/features/reports/pages/report-builder-page.tsx`
  - `web/src/features/reports/components/pivot-config-panel.tsx`
  - `web/src/features/reports/components/report-data-table.tsx`
  - new pivot transformation/renderer helpers under reports feature
- **Frontend state/schemas**:
  - `web/src/features/reports/hooks/use-report-filters.ts`
  - `web/src/features/reports/schemas/index.ts` (if needed for new field handling)
- **Backend API**:
  - `backend/api/endpoints/reports.py` sprint field mapping hardening
- **Quality**:
  - update related tests in `web/src/features/reports/components/*.test.tsx`
  - run report feature tests and type-check
