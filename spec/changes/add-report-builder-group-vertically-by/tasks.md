# Implementation Tasks — add-report-builder-group-vertically-by

1. Scaffold OpenSpec change docs and validate structure.
2. Add `group_vertically_by` field to report filter state with default `null`.
3. Add `Group vertically by` single-select to Pivot configuration UI.
4. Add validation preventing the same field for both horizontal and vertical grouping.
5. Extend pivot model builder to apply vertical grouping symmetrically with horizontal grouping.
6. Pass new filter field through report page into table renderer.
7. Update/extend unit tests for pivot config, filters, and report table grouping behavior.
8. Run reports test suite and ensure all pass.
9. Mark change implemented.
