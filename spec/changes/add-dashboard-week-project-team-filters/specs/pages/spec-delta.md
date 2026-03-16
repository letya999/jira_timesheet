# Spec Delta - Dashboard week/project/team filters

**Change**: `add-dashboard-week-project-team-filters`
**Target spec**: `spec/specs/pages/spec.md`

## MODIFIED Requirements

### Requirement: Dashboard Page

WHEN an authenticated user navigates to `/app/dashboard`,
the system SHALL provide collapsible filters for week, project, and team and SHALL render dashboard data for the selected week and filters.

#### Scenario: Dashboard filters are collapsible
GIVEN a user is on `/app/dashboard`
WHEN the page renders
THEN a collapsible "Dashboard filters" section SHALL be visible
AND the section SHALL contain controls for Week, Project, and Team.

#### Scenario: Week filter updates displayed data
GIVEN a user selected a week on `/app/dashboard`
WHEN the selected week changes
THEN dashboard KPI cards SHALL update to reflect data in that concrete Monday-Sunday week
AND recent activity table SHALL show entries from that selected week.

#### Scenario: Project and team filters narrow dataset
GIVEN a user selected a project and/or team in dashboard filters
WHEN data is loaded
THEN dashboard KPI cards SHALL be calculated only from entries matching selected project/team
AND recent activity table SHALL include only rows matching selected project/team.

#### Scenario: Empty state with restrictive filters
GIVEN selected filters produce no matching entries
WHEN the dashboard renders
THEN KPI cards SHALL show 0h values
AND recent activity section SHALL show an empty-state table.