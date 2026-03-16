# Proposal: add-report-builder-group-vertically-by

## Why

Report Builder already supports `Group horizontally by`, but users also need a symmetric control for row-side grouping to avoid row duplication and to build compact grouped output by a single selected dimension.

Without this, users cannot quickly pivot repeated records into row groups when the grouping field is currently on columns or mixed with row dimensions.

## What Changes

- Add `Group vertically by` single-select control in Pivot configuration.
- Extend report filter state with `group_vertically_by`.
- Update pivot transformation logic so vertical grouping behaves symmetrically to horizontal grouping:
  - selected vertical field is injected into effective row grouping,
  - if that field appears in column dimensions, it is removed from effective columns,
  - selection order remains stable.
- Add validation for ambiguous case when the same field is selected for both horizontal and vertical grouping.
- Update tests for pivot config and pivot table behavior.

## Impact

- `web/src/features/reports/components/pivot-config-panel.tsx`
- `web/src/features/reports/hooks/use-report-filters.ts`
- `web/src/features/reports/components/report-data-table.tsx`
- `web/src/features/reports/utils/pivot-table.ts`
- Report tests in `web/src/features/reports/components/*.test.tsx` and hooks/page tests as needed.
