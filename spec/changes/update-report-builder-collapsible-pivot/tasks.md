# Implementation Tasks — update-report-builder-collapsible-pivot

1. Add OpenSpec change scaffolding and verify proposal/tasks/spec-delta structure.
2. Refactor `/app/reports` page layout to use collapsible blocks for Data filters and Pivot configuration.
3. Wrap aggregated metrics cards in a collapsible block.
4. Extend report filters state with a single-select `group_horizontally_by` field and wire it into Pivot configuration UI.
5. Implement pivot transformation utility that:
   - uses only selected row dimensions and column dimensions,
   - preserves selection order,
   - supports date granularity mapping,
   - supports additional horizontal grouping field,
   - aggregates by `value`.
6. Replace flat `ReportDataTable` rendering with a nested-header pivot table renderer.
7. Add focus behavior for table container so table height fits viewport and headers stay sticky while focused.
8. Ensure non-selected fields (e.g. `issue_key`, `release` when not selected) are excluded from table output.
9. Fix backend sprint extraction in `/api/v1/reports/custom` so sprint values are not always empty.
10. Update report component/unit tests for new controls and pivot rendering behavior.
11. Run web type-check and targeted report tests; fix regressions.
12. Mark change implemented with `IMPLEMENTED` file.
