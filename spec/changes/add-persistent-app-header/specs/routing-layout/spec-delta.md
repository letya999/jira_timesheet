# Spec Delta: Routing Layout

## ADDED Requirements

### Requirement: Persistent Global Header
WHEN an authenticated user is on any `/app/*` route,
THEN the system SHALL render a single persistent header that remains visible and interactive at the top of the viewport.

#### Scenario: Header is visible across app pages
GIVEN the user navigates between `/app/*` pages
WHEN each page is rendered
THEN the same header component is shown without per-page variation
AND it remains available while page content is scrolled.

### Requirement: Header Navigation Controls
WHEN the global header is rendered,
THEN it SHALL provide top-left branding and sidebar control, and top-right account controls.

#### Scenario: Left header controls
GIVEN the global header is visible
WHEN the user looks at the top-left section
THEN the `JT` label is displayed
AND a sidebar expand/collapse button is present and clickable.

#### Scenario: Right header controls
GIVEN the global header is visible
WHEN the user looks at the top-right section
THEN profile, notifications, and language-switch controls are present and clickable.
