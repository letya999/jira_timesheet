# Spec Delta: Update AI Chat with Vanna Integration

## ADDED Requirements

### Requirement: AI Chat Assistant
WHEN the user enters a natural language query in the AI Chat interface,
the system SHALL use Vanna AI to translate the query into SQL, 
execute it against the database, 
and summarize the results in plain text.

#### Scenario: SQL Generation and Data Retrieval
GIVEN a user with `ai-chat:read` permission
WHEN the user asks "Show me all projects with more than 100 total hours"
THEN the system SHALL generate a valid SQL query
AND the system SHALL execute the query safely (SELECT only)
AND the system SHALL display the SQL, the data table, and a summary.

#### Scenario: Insecure Query Rejection
GIVEN a user with `ai-chat:read` permission
WHEN the user asks a query that results in non-SELECT SQL (e.g., DROP TABLE)
THEN the system SHALL reject the query and display an "INSECURE_SQL" error.

### Requirement: Database Training
WHEN an administrator triggers a database training operation,
the system SHALL introspect the current schema and update the Vanna AI training data.

#### Scenario: Training triggered by Admin
GIVEN a user with `ai-chat:train` permission
WHEN the user clicks the "Train AI" button
THEN the system SHALL scan the `public` schema (excluding `alembic_version`)
AND the system SHALL send DDL information to Vanna for training
AND the system SHALL display a success message with the number of tables trained.

#### Scenario: Training restricted to Admin
GIVEN a user without `ai-chat:train` permission
THEN the "Train AI" button SHALL NOT be visible.

## MODIFIED Requirements

### Requirement: Sidebar Navigation
**MODIFIED**:
WHEN the system is initialized,
it SHALL display the "AI Chat" item in the sidebar 
ONLY IF `VITE_AI_ENABLED` is true AND the user has `ai-chat:read` permission.
*(Previously, permission check was not fully enforced in the nav filter)*
