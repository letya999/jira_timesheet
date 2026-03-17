# Spec Delta: implement-project-manager-team-lead-rbac (org)

## MODIFIED Requirements

### Requirement: Org tree leadership display
WHEN an org unit node is expanded in org hierarchy widget
THEN leadership cards SHALL be shown directly below the unit header.

#### Scenario: Highlight manager leaders
GIVEN users assigned to unit roles `Project Manager` or `Team Lead`
WHEN the unit is rendered
THEN those users SHALL be displayed in highlighted leadership cards.

#### Scenario: Admin hidden from org widget
GIVEN a system user with role `Admin` or `CEO`
WHEN org hierarchy is rendered
THEN that user SHALL not be displayed in leadership/member blocks
AND admin access rights SHALL remain unaffected.