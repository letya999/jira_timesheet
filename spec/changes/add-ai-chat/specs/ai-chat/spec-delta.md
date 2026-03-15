# Capability Delta: AI Chat

## ADDED Requirements

### Requirement: AI-Powered Natural Language Querying
WHEN a user with `ai-chat:read` permission submits a natural language question about the timesheet data,
the system SHALL generate SQL, execute it, and provide an answer.

#### Scenario: Successful Query
GIVEN a user with `ai-chat:read` permission
AND the AI service is enabled and configured with an API key
WHEN the user asks "How many hours did user 'John Doe' log in January 2026?"
THEN the system SHALL stream stages: `generating_sql` -> `sql` -> `running_query` -> `data` -> `complete`
AND the system SHALL display the generated SQL in a collapsible block
AND the system SHALL display the result data in a table format
AND the system SHALL provide a textual summary of the result.

#### Scenario: SQL Injection Prevention
GIVEN a user with `ai-chat:read` permission
WHEN the user asks a question that generates a non-SELECT statement (e.g. DELETE, DROP, UPDATE)
THEN the system SHALL refuse to execute the query
AND return a stage `error` with a sanitized message.

#### Scenario: Statement Timeout
GIVEN a user with `ai-chat:read` permission
WHEN a query takes longer than `AI_QUERY_TIMEOUT_SECONDS` (default 10s)
THEN the system SHALL terminate the query
AND return a stage `error` with a sanitized message.

### Requirement: Admin AI Training
WHEN an Admin with `ai-chat:train` permission triggers a training session,
the system SHALL extract the current database schema DDL and train the AI model.

#### Scenario: Training Schema
GIVEN an Admin with `ai-chat:train` permission
WHEN the user clicks the "Train" button
THEN the system SHALL extract all table and column information from `information_schema.columns`
AND train the Vanna.ai instance
AND return `success: true` with the count of tables trained.
