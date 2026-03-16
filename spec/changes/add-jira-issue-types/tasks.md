# Tasks: Add Jira Issue Types Support

1. Create IssueType database model in `backend/models/project.py`.
2. Update Issue model in `backend/models/project.py` to link with IssueType.
3. Update Issue schemas in `backend/schemas/project.py` to include IssueType info.
4. Modify Jira sync logic in `backend/services/jira.py` to:
   - Extract full issue type info from Jira API response.
   - Sync issue types to the database (with deduplication).
   - Link issues to their respective IssueType records.
5. Create a database migration to add the `issue_types` table and update the `issues` table.
6. Verify synchronization by running a test sync for a project.
7. Update related API endpoints and tests to reflect the new issue type structure.
