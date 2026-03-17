# Spec Delta: Report Builder Issue Dimensions

Target spec: `spec/specs/pages/spec.md` — Report Builder Page

## ADDED Requirements

### Requirement: Issue Link Pivot Dimension
WHEN a user selects `issue_link` as a row or column dimension in the Pivot Configuration,
the system SHALL group worklogs by the Jira browse URL of their associated issue
AND the data table SHALL render each `issue_link` cell as a clickable hyperlink
with the issue key as display text (e.g., "PROJ-123") opening in a new tab.

#### Scenario: issue_link renders as link
GIVEN a report has been run with `issue_link` as a row dimension
WHEN the data table is rendered
THEN each non-N/A cell in the issue_link column is an `<a>` element
AND its `href` is the full Jira browse URL
AND its visible text is the issue key extracted from the URL

#### Scenario: issue without a Jira issue shows N/A
GIVEN a worklog has no associated Jira issue
WHEN `issue_link` is used as a dimension
THEN the dimension value is "N/A"

### Requirement: Issue Name Pivot Dimension
WHEN a user selects `issue_name` as a pivot dimension,
the system SHALL populate the value from the worklog description for MANUAL worklogs (falling back to issue summary if description is empty),
and from the issue summary for JIRA worklogs.

#### Scenario: Manual worklog uses description as issue_name
GIVEN a worklog with `type == "MANUAL"` and a non-empty `description`
WHEN `issue_name` is used as a pivot dimension
THEN the dimension value equals the worklog's `description` field

#### Scenario: JIRA worklog uses issue summary as issue_name
GIVEN a worklog with `type == "JIRA"` linked to an issue with summary "Fix login bug"
WHEN `issue_name` is used as a pivot dimension
THEN the dimension value is "Fix login bug"

#### Scenario: Manual worklog with no description falls back to issue summary
GIVEN a worklog with `type == "MANUAL"` and an empty `description` linked to an issue
WHEN `issue_name` is used as a pivot dimension
THEN the dimension value equals the issue summary

### Requirement: Issue Type Pivot Dimension
WHEN a user selects `issue_type` as a pivot dimension,
the system SHALL populate the value from `issue_type_obj.name` if the issue has a linked IssueType record,
falling back to the legacy `issue.issue_type` string field,
and showing "N/A" if neither is available.

#### Scenario: Issue with IssueType relation
GIVEN an issue linked to an IssueType with name "Bug"
WHEN `issue_type` is used as a pivot dimension
THEN the dimension value is "Bug"

#### Scenario: Issue with only legacy string type
GIVEN an issue with `issue_type = "Story"` and no `issue_type_obj`
WHEN `issue_type` is used as a pivot dimension
THEN the dimension value is "Story"
