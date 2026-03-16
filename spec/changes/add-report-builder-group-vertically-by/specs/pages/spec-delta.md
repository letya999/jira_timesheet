# Spec Delta — Report Builder Vertical Grouping Control

**Change**: `add-report-builder-group-vertically-by`
**Target spec**: `spec/specs/pages/spec.md`

## MODIFIED Requirements

### Requirement: Report Builder Page

WHEN a user configures pivot output,
the system SHALL support one-field vertical grouping in addition to one-field horizontal grouping.

#### Scenario: Group vertically by control
GIVEN the Pivot configuration section is visible
WHEN controls are rendered
THEN the page SHALL show `Group vertically by` as a single-select control
AND the control SHALL allow selecting one dimension field.

#### Scenario: Vertical grouping affects row output
GIVEN report data is loaded
WHEN a field is selected in `Group vertically by`
THEN that field SHALL be included in effective row grouping
AND if the field is present in column dimensions it SHALL be removed from effective columns.

#### Scenario: Ambiguous same-field selection
GIVEN the same field is selected in both `Group horizontally by` and `Group vertically by`
WHEN validation runs
THEN the Run Report action SHALL be disabled
AND an inline conflict message SHALL be shown.
