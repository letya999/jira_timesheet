# Specification Delta: Reusable UI Components

## ADDED Requirements

### Requirement: Card List Component
The system SHALL provide a `CardList` component to display a collection of items in a card format.
- It SHALL support generic item types.
- It SHALL take a `renderItem` function.
- It SHALL handle loading states using Skeletons.
- It SHALL integrate with the `ListPagination` component.

#### Scenario: Successful List Rendering
GIVEN a list of 10 items
WHEN the `CardList` is rendered with a custom `renderItem` function
THEN it SHALL display 10 cards using that function.

#### Scenario: Loading State
GIVEN the `isLoading` prop is true
WHEN the `CardList` is rendered
THEN it SHALL display 3 Skeleton items.

### Requirement: Action Table Component
The system SHALL provide an `ActionTable` component for displaying tabular data with row actions and selection.
- It SHALL extend the `DataTable` base component.
- It SHALL automatically integrate with `ListPagination`.
- It SHALL support row selection and bulk actions.

#### Scenario: Table with Pagination
GIVEN a dataset of 50 items and a page size of 10
WHEN the `ActionTable` is rendered
THEN it SHALL display the first 10 items
AND it SHALL display the `ListPagination` component at the bottom.

### Requirement: Pivot Table Component
The system SHALL provide a `PivotTable` component for displaying multidimensional data.
- It SHALL support both read-only and editable modes.
- It SHALL handle horizontal and vertical grouping of dimensions.
- It SHALL support virtualization for large datasets.

#### Scenario: Editable 7-Day Grid
GIVEN a 7-day date range and editable mode
WHEN the `PivotTable` is rendered
THEN it SHALL display input fields for each day
AND allow updating values.

## MODIFIED Requirements
None.
