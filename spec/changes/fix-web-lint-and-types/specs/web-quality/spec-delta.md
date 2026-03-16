# Specification Delta: Web Quality Standards

## MODIFIED Requirements

### Requirement: Code Quality (Web)
THE web application SHALL maintain strict type safety and follow ESLint best practices to ensure maintainability and prevent runtime errors.

#### Scenario: Type Safety
WHEN a developer introduces a type mismatch or potential null reference,
THEN the TypeScript compiler SHALL report an error.

#### Scenario: API Communication
WHEN custom hooks are used to fetch or mutate data,
THEN they SHALL strictly adhere to the types generated from the OpenAPI specification.

#### Scenario: Component Exports (Fast Refresh)
WHEN a file is used for React component exports,
THEN it SHALL NOT export non-component constants or functions to avoid breaking Fast Refresh.

#### Scenario: Storybook Hook Usage
WHEN a React Hook is used within a Storybook story,
THEN it SHALL be called only within a function component (e.g., using a capitalized renderer).

### Requirement: Dead Code Prevention
THE codebase SHALL be free of unused imports and variables.

#### Scenario: Unused Variables
WHEN a variable is defined but not used,
THEN the linter SHALL report an error, unless the variable name starts with an underscore (`_`).
