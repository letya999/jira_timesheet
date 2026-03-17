# Spec Delta: fix-control-sheet-filtering-pagination

## MODIFIED Requirements

### Requirement: Control Sheet shows Team Summary and Employee Summary
WHEN control-sheet data is loaded
THEN the page SHALL render two sections: Team Summary and Employee Summary.
AND when a specific team is selected in the Team filter, both sections SHALL ONLY display employees belonging to that team.

#### Scenario: Team Filtering
GIVEN an authenticated manager/admin on `/app/control-sheet`
WHEN they select a team from the Team dropdown
THEN the Team Summary matrix SHALL update to only show members of that team
AND the Employee Summary list SHALL update to only show members of that team.

### Requirement: Employee Summary supports pagination
WHEN Employee Summary contains more than `pageSize` employees
THEN the list SHALL be paginated
AND pagination controls SHALL be displayed below the list.

#### Scenario: Pagination in Employee Summary
GIVEN an authenticated manager/admin on `/app/control-sheet`
WHEN the selected team (or "All") has more than 10 members
THEN the Employee Summary section SHALL display only the first 10 members
AND the "Next" button in pagination SHALL be enabled.
WHEN they click "Next"
THEN the list SHALL display the next 10 members.
