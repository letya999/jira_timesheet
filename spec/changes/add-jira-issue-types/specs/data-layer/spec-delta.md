# Spec Delta: Add Jira Issue Types to Data Layer

## ADDED Requirements

### Requirement: Jira Issue Type Storage
The system SHALL store detailed information about Jira issue types in the database.

#### Scenario: Syncing New Issue Type
GIVEN a Jira sync operation is running
WHEN an issue with a previously unknown issue type is encountered
THEN the system SHALL create a new IssueType record
AND store its `jira_id`, `name`, `icon_url`, and `is_subtask`.

### Requirement: Rich Issue Information
The system SHALL associate each synced issue with its corresponding IssueType record.

#### Scenario: Synced Issue Retrieval
GIVEN an issue exists in the database with an associated issue type
WHEN the issue details are retrieved via API
THEN the response SHALL include the full IssueType information (name, icon URL).

## MODIFIED Requirements

### Requirement: Jira Issue Synchronization
The synchronization process SHALL extract and persist full issue type metadata from the Jira API.

#### Scenario: Issue Sync Enrichment
GIVEN the Jira API provides issue type details (ID, name, iconUrl, subtask)
WHEN an issue is synced from Jira
THEN the system SHALL resolve the issue type to its record in the database
AND link the issue to it.
