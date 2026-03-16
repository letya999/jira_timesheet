# Spec Delta: Update 'any' to Strict Types

## ADDED Requirements

### Requirement: Strict Type Enforcement
WHEN developing frontend components or hooks, 
developers SHALL NOT use the `any` type for API responses, form data, or component props.

#### Scenario: Using Generated SDK Types
GIVEN an API response from the backend
WHEN implementing a hook using `sdk.gen.ts`
THEN the hook SHALL use the generated types for both input parameters and return data.

#### Scenario: Fallback to 'unknown'
GIVEN a scenario where a specific type is unavailable or dynamically determined
WHEN a developer needs to bypass strict type checking
THEN the developer SHALL use `unknown` instead of `any`
AND use type guards or explicit assertions before using the value.

### Requirement: UI Component Typing
WHEN creating reusable UI components
THEN the components SHALL be typed using `React.ComponentProps` or specific interfaces for their props.
